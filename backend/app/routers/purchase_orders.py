"""
Purchase Orders (the "PO" tab).

  PO tab -> pick a department -> every PO ever issued for that department
  "+ Create Purchase Order" -> pick department -> pick vendor -> pick items
      (items are filtered to the chosen department) -> save -> download PDF

A saved PO is the stored artefact: the PDF is rendered from it on demand
(browser print -> "Save as PDF"), so re-downloading an old PO always
produces exactly the same document, and every PO stays filed under the
department it was issued for.
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas
from app.department_profiles import profile_for,item_source_codes

router = APIRouter(prefix="/api", tags=["purchase-orders"])


def _round(x: float) -> float:
    return round(float(x or 0.0), 2)


# ---------- Department letterhead ----------

@router.get("/departments/{department_id}/po-profile", response_model=schemas.DepartmentPOProfileOut)
def get_department_po_profile(department_id: int, db: Session = Depends(get_db)):
    """Logo + company details the PO should print for this department.
    The Create PO form calls this whenever the department changes, which is
    what swaps the logo/company block for DD ENGINEERING vs I LAB etc."""
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return profile_for(department)


@router.get("/po-profiles", response_model=list[schemas.DepartmentPOProfileOut])
def list_po_profiles(db: Session = Depends(get_db)):
    departments = db.query(models.Department).order_by(models.Department.name).all()
    return [profile_for(d) for d in departments]


# ---------- Items pickable on a PO, scoped to one department ----------

@router.get("/departments/{department_id}/po-items", response_model=list[schemas.POItemOptionOut])
def get_po_items(
    department_id: int,
    supplier_id: Optional[int] = Query(
        None, description="If given, only return items that have a price from this vendor"
    ),
    db: Session = Depends(get_db),
):
    """
    Flat, searchable list of everything in this department that can go on a
    PO - top-level items AND subitems.

    If `supplier_id` is given, the list is narrowed to items that actually
    have a price from that vendor, and each item's `vendors` list only
    contains that vendor's offer (so picking an item always pre-fills the
    price for the vendor chosen on the form).
    """
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    source_codes = item_source_codes(department)
    source_dept_ids = [
        d.id for d in db.query(models.Department).filter(models.Department.code.in_(source_codes)).all()
    ] or [department_id]  # fallback: never end up with an empty filter

    products = (
        db.query(models.Product)
        .options(joinedload(models.Product.category), joinedload(models.Product.parent))
        .filter(models.Product.department_id.in_(source_dept_ids))
        .order_by(models.Product.name)
        .all()
    )
    if not products:
        return []

    product_ids = [p.id for p in products]

    sp_query = (
        db.query(models.SupplierProduct)
        .options(joinedload(models.SupplierProduct.supplier))
        .filter(models.SupplierProduct.product_id.in_(product_ids))
    )
    if supplier_id is not None:
        sp_query = sp_query.filter(models.SupplierProduct.supplier_id == supplier_id)
    sp_list = sp_query.all()

    sp_by_product: dict[int, list[models.SupplierProduct]] = {}
    for sp in sp_list:
        sp_by_product.setdefault(sp.product_id, []).append(sp)

    options = []
    for p in products:
        offers = sp_by_product.get(p.id, [])
        if supplier_id is not None and not offers:
            continue  # this item has no price from the selected vendor
        offers = sorted(offers, key=lambda sp: sp.unit_price)
        options.append(
            schemas.POItemOptionOut(
                product_id=p.id,
                product_name=p.name,
                variant_code_or_size=p.variant_code_or_size,
                category_id=p.category_id,
                category_name=p.category.name if p.category else None,
                parent_name=p.parent.name if p.parent_id and p.parent else None,
                vendors=[
                    schemas.POItemVendorOut(
                        supplier_product_id=sp.id,
                        supplier_id=sp.supplier_id,
                        supplier_name=sp.supplier.name,
                        pricing_mode=sp.pricing_mode,
                        unit_price=sp.unit_price,
                        total_price=sp.total_price,
                        total_length_or_quantity=sp.total_length_or_quantity,
                        po_unit_price=(
                            sp.total_price if sp.pricing_mode in ("sq_inch", "sq_feet") else sp.unit_price
                        ),
                        is_cheapest=(idx == 0),
                    )
                    for idx, sp in enumerate(offers)
                ],
            )
        )

    options.sort(key=lambda o: ((o.parent_name or o.product_name).lower(), o.product_name.lower()))
    return options


# ---------- PO numbering ----------

def _next_po_number(db: Session, department: models.Department) -> str:
    prefix = profile_for(department)["po_prefix"]
    seq = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.department_id == department.id)
        .count()
        + 1
    )
    # Collision-safe: a deleted PO leaves a gap, so step forward until free.
    while True:
        candidate = f"{prefix}-{seq:04d}"
        exists = (
            db.query(models.PurchaseOrder)
            .filter(models.PurchaseOrder.po_number == candidate)
            .first()
        )
        if not exists:
            return candidate
        seq += 1

def _po_datetime(d: date) -> datetime:
    """User-picked PO date -> the timestamp we store.
    Pinned to 12:00 UTC so the calendar day stays the same after the
    browser converts it to local time."""
    return datetime(d.year, d.month, d.day, 12, 0, tzinfo=timezone.utc)

def _validate_po_number(db: Session, po_number: str, exclude_id: Optional[int] = None) -> None:
    """Raise if another PO already uses this number. po_number is globally
    unique (see the UniqueConstraint on PurchaseOrder.po_number), not just
    unique within a department."""
    query = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number)
    if exclude_id is not None:
        query = query.filter(models.PurchaseOrder.id != exclude_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Another purchase order already uses this number.")


# ---------- Create / read / delete ----------

def _to_out(po: models.PurchaseOrder) -> schemas.PurchaseOrderOut:
    out = schemas.PurchaseOrderOut.model_validate(po)
    out.supplier_name = po.supplier.name if po.supplier else None
    out.department_name = po.department.name if po.department else None
    return out


@router.post("/purchase-orders", response_model=schemas.PurchaseOrderOut)
def create_purchase_order(payload: schemas.PurchaseOrderCreate, db: Session = Depends(get_db)):
    department = db.query(models.Department).filter(models.Department.id == payload.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    if not payload.lines:
        raise HTTPException(status_code=400, detail="Add at least one item to the purchase order.")

    supplier = None
    if payload.supplier_id:
        supplier = db.query(models.Supplier).filter(models.Supplier.id == payload.supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Vendor not found")

    profile = profile_for(department)

    if payload.po_number and payload.po_number.strip():
        po_number = payload.po_number.strip()
        _validate_po_number(db, po_number)
    else:
        po_number = _next_po_number(db, department)

    subtotal = _round(sum(l.qty * l.unit_price for l in payload.lines))
    discount = _round(payload.discount)
    less_discount = _round(subtotal - discount)
    total_tax = _round(less_discount * (payload.tax_rate or 0.0) / 100.0)
    shipping = _round(payload.shipping_handling)
    other = _round(payload.other)
    total = _round(less_discount + total_tax + shipping + other)

    po = models.PurchaseOrder(
        po_number=po_number,
        department_id=department.id,
        po_date=_po_datetime(payload.po_date) if payload.po_date else datetime.now(timezone.utc),
        customer_no=payload.customer_no,
        company_name=profile["company_name"],
        company_address_line1=profile.get("address_line1"),
        company_address_line2=profile.get("address_line2"),
        company_phone=profile.get("phone"),
        company_email=profile.get("email"),
        company_website=profile.get("website"),
        company_contact=profile.get("contact_person"),
        logo_text=profile.get("logo_text"),
        logo_color=profile.get("logo_color"),
        logo_url=profile.get("logo_url"),
        supplier_id=supplier.id if supplier else None,
        vendor_name=payload.vendor_name or (supplier.name if supplier else None),
        vendor_address=payload.vendor_address,
        bill_to=payload.bill_to,
        ship_to=payload.ship_to,
        shipping_method=payload.shipping_method,
        shipping_terms=payload.shipping_terms,
        ship_via=payload.ship_via,
        payment_terms=payload.payment_terms,
        delivery_date=payload.delivery_date,
        remarks=payload.remarks,
        show_item_no=payload.show_item_no,
        subtotal=subtotal,
        discount=discount,
        subtotal_less_discount=less_discount,
        tax_rate=payload.tax_rate or 0.0,
        total_tax=total_tax,
        shipping_handling=shipping,
        other=other,
        total=total,
    )
    db.add(po)
    db.flush()

    for idx, line in enumerate(payload.lines):
        db.add(
            models.PurchaseOrderLine(
                purchase_order_id=po.id,
                position=idx,
                product_id=line.product_id,
                supplier_product_id=line.supplier_product_id,
                item_no=line.item_no,
                description=line.description.strip(),
                qty=line.qty,
                unit_price=line.unit_price,
                line_total=_round(line.qty * line.unit_price),
            )
        )

    db.commit()
    db.refresh(po)
    return _to_out(po)


@router.put("/purchase-orders/{po_id}", response_model=schemas.PurchaseOrderOut)
def update_purchase_order(po_id: int, payload: schemas.PurchaseOrderCreate, db: Session = Depends(get_db)):
   
    po = (
        db.query(models.PurchaseOrder)
        .options(joinedload(models.PurchaseOrder.lines))
        .filter(models.PurchaseOrder.id == po_id)
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if payload.department_id != po.department_id:
        raise HTTPException(
            status_code=400,
            detail="Changing the department of an existing purchase order isn't supported.",
        )

    if not payload.lines:
        raise HTTPException(status_code=400, detail="Add at least one item to the purchase order.")

    if payload.po_number and payload.po_number.strip():
        new_po_number = payload.po_number.strip()
        if new_po_number != po.po_number:
            _validate_po_number(db, new_po_number, exclude_id=po.id)
        po.po_number = new_po_number

    supplier = None
    if payload.supplier_id:
        supplier = db.query(models.Supplier).filter(models.Supplier.id == payload.supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Vendor not found")

    subtotal = _round(sum(l.qty * l.unit_price for l in payload.lines))
    discount = _round(payload.discount)
    less_discount = _round(subtotal - discount)
    total_tax = _round(less_discount * (payload.tax_rate or 0.0) / 100.0)
    shipping = _round(payload.shipping_handling)
    other = _round(payload.other)
    total = _round(less_discount + total_tax + shipping + other)

    if payload.po_date:
        po.po_date = _po_datetime(payload.po_date)
    po.customer_no = payload.customer_no
    po.supplier_id = supplier.id if supplier else None
    po.vendor_name = payload.vendor_name or (supplier.name if supplier else None)
    po.vendor_address = payload.vendor_address
    po.bill_to = payload.bill_to
    po.ship_to = payload.ship_to
    po.shipping_method = payload.shipping_method
    po.shipping_terms = payload.shipping_terms
    po.ship_via = payload.ship_via
    po.payment_terms = payload.payment_terms
    po.delivery_date = payload.delivery_date
    po.remarks = payload.remarks
    po.show_item_no = payload.show_item_no
    po.subtotal = subtotal
    po.discount = discount
    po.subtotal_less_discount = less_discount
    po.tax_rate = payload.tax_rate or 0.0
    po.total_tax = total_tax
    po.shipping_handling = shipping
    po.other = other
    po.total = total

    # Replace lines wholesale - cascade="all, delete-orphan" on the
    # relationship handles deleting the old rows once we flush.
    po.lines = []
    db.flush()
    for idx, line in enumerate(payload.lines):
        db.add(
            models.PurchaseOrderLine(
                purchase_order_id=po.id,
                position=idx,
                product_id=line.product_id,
                supplier_product_id=line.supplier_product_id,
                item_no=line.item_no,
                description=line.description.strip(),
                qty=line.qty,
                unit_price=line.unit_price,
                line_total=_round(line.qty * line.unit_price),
            )
        )

    db.commit()
    db.refresh(po)
    return _to_out(po)


@router.get("/purchase-orders", response_model=list[schemas.PurchaseOrderSummaryOut])
def list_purchase_orders(
    department_id: Optional[int] = Query(None, description="Filter to one department"),
    search: Optional[str] = Query(None, description="Match PO number or vendor name"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.PurchaseOrder)
        .options(
            joinedload(models.PurchaseOrder.department),
            joinedload(models.PurchaseOrder.supplier),
            joinedload(models.PurchaseOrder.lines),
        )
    )
    if department_id:
        query = query.filter(models.PurchaseOrder.department_id == department_id)

    if search:
        like = f"%{search.strip()}%"
        query = query.outerjoin(models.Supplier, models.PurchaseOrder.supplier_id == models.Supplier.id).filter(
            or_(models.PurchaseOrder.po_number.ilike(like), models.Supplier.name.ilike(like))
        )

    pos = query.order_by(models.PurchaseOrder.po_date.desc(), models.PurchaseOrder.id.desc()).all()

    return [
        schemas.PurchaseOrderSummaryOut(
            id=po.id,
            po_number=po.po_number,
            po_date=po.po_date,
            department_id=po.department_id,
            department_name=po.department.name if po.department else "",
            supplier_name=po.supplier.name if po.supplier else None,
            supplier_phone=po.supplier.phone if po.supplier else None,
            line_count=len(po.lines),
            total=po.total,
        )
        for po in pos
    ]


@router.get("/purchase-orders/{po_id}", response_model=schemas.PurchaseOrderOut)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = (
        db.query(models.PurchaseOrder)
        .options(
            joinedload(models.PurchaseOrder.department),
            joinedload(models.PurchaseOrder.supplier),
            joinedload(models.PurchaseOrder.lines),
        )
        .filter(models.PurchaseOrder.id == po_id)
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return _to_out(po)


@router.delete("/purchase-orders/{po_id}")
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    db.delete(po)
    db.commit()
    return {"detail": "Deleted"}