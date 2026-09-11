from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/admin", tags=["admin"])


INCH_PER_UNIT = {
    "in": 1.0,
    "ft": 12.0,
    "m": 39.3701,
    "cm": 0.393701,
}


def _to_inches(value: float, unit: str) -> float:
    return value * INCH_PER_UNIT.get(unit, 1.0)


def _resolve_dimensions(
    payload,
) -> Tuple[float, Optional[float], Optional[str], Optional[float], Optional[str]]:
    if payload.pricing_mode == "quantity":
        return payload.quantity, None, None, None, None

    length_in = _to_inches(payload.length, payload.length_unit)
    width_in = _to_inches(payload.width, payload.width_unit)
    area_sq_in = length_in * width_in

    divisor = area_sq_in / 144.0 if payload.pricing_mode == "sq_feet" else area_sq_in

    return divisor, payload.length, payload.length_unit, payload.width, payload.width_unit


@router.post("/suppliers", response_model=schemas.SupplierOut)
def create_supplier(payload: schemas.SupplierCreate, db: Session = Depends(get_db)):
    """Create a new vendor. Used both from Manage and from the inline
    'Create vendor' button on the searchable vendor picker."""
    existing = (
        db.query(models.Supplier)
        .filter(models.Supplier.name.ilike(payload.name.strip()))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Vendor already exists")
    supplier = models.Supplier(name=payload.name.strip())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return {"detail": "Deleted"}


@router.post("/categories", response_model=schemas.CategoryOut)
def create_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category. Used both from Manage and from the inline
    'Create category' button on the New Product form."""
    existing = (
        db.query(models.Category)
        .filter(models.Category.name.ilike(payload.name.strip()))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    category = models.Category(name=payload.name.strip())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(category_id: int, payload: schemas.CategoryUpdate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    clash = (
        db.query(models.Category)
        .filter(models.Category.id != category_id, models.Category.name.ilike(payload.name.strip()))
        .first()
    )
    if clash:
        raise HTTPException(status_code=400, detail="Another category with this name already exists")

    category.name = payload.name.strip()
    db.commit()
    db.refresh(category)
    return category



@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return {"detail": "Deleted"}

@router.post("/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(models.Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    category = db.query(models.Category).filter(models.Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    product.category_name = category.name
    return product

@router.put("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    category = db.query(models.Category).filter(models.Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    clash = (
        db.query(models.Product)
        .filter(
            models.Product.id != product_id,
            models.Product.department_id == product.department_id,
            models.Product.name == payload.name.strip(),
            models.Product.variant_code_or_size == (payload.variant_code_or_size.strip() if payload.variant_code_or_size else None),
        )
        .first()
    )
    if clash:
        raise HTTPException(
            status_code=400,
            detail="Another item with this name and variant already exists in this department.",
        )

    product.name = payload.name.strip()
    product.variant_code_or_size = payload.variant_code_or_size.strip() if payload.variant_code_or_size else None
    product.category_id = payload.category_id
    db.commit()
    db.refresh(product)
    product.category_name = category.name
    return product

@router.get("/products/{product_id}/siblings", response_model=list[schemas.ProductSiblingOut])
def get_product_siblings(
    product_id: int,
    supplier_id: Optional[int] = Query(
        None, description="If given, exclude siblings that already have a price from this vendor"
    ),
    db: Session = Depends(get_db),
):
    """
    Other Product rows that are really "the same item" living in a
    different department - i.e. rows created together via the New Product
    form's multi-department checkboxes (same name + variant/size, different
    department_id). Powers AddVendorModal's "add this vendor to <dept> too?"
    follow-up prompts after a vendor price is added to just one department.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Item not found")

    siblings = (
        db.query(models.Product)
        .options(joinedload(models.Product.department))
        .filter(
            models.Product.id != product_id,
            models.Product.name == product.name,
            models.Product.variant_code_or_size == product.variant_code_or_size,
        )
        .all()
    )

    if supplier_id is not None and siblings:
        sibling_ids = [s.id for s in siblings]
        already_priced_ids = {
            row.product_id
            for row in db.query(models.SupplierProduct.product_id)
            .filter(
                models.SupplierProduct.supplier_id == supplier_id,
                models.SupplierProduct.product_id.in_(sibling_ids),
            )
            .all()
        }
        siblings = [s for s in siblings if s.id not in already_priced_ids]

    for s in siblings:
        s.department_name = s.department.name

    return siblings

@router.get("/products/{product_id}/vendor-siblings", response_model=list[schemas.VendorSiblingOut])
def get_vendor_siblings(
    product_id: int,
    supplier_id: int = Query(..., description="Only return siblings that already have a price from this vendor"),
    db: Session = Depends(get_db),
):
    """
    Other departments' copies of this same item (same name + variant) that
    ALREADY have a price from this same vendor. Powers EditPriceModal's
    "update this price in <dept> too?" follow-up prompts after a price
    edit in just one department, since each department's copy has its own
    independent SupplierProduct row that nothing else keeps in sync.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Item not found")

    siblings = (
        db.query(models.Product)
        .options(joinedload(models.Product.department))
        .filter(
            models.Product.id != product_id,
            models.Product.name == product.name,
            models.Product.variant_code_or_size == product.variant_code_or_size,
        )
        .all()
    )
    if not siblings:
        return []

    sibling_ids = [s.id for s in siblings]
    sp_list = (
        db.query(models.SupplierProduct)
        .filter(
            models.SupplierProduct.supplier_id == supplier_id,
            models.SupplierProduct.product_id.in_(sibling_ids),
        )
        .all()
    )
    sp_by_product_id = {sp.product_id: sp for sp in sp_list}

    result = []
    for s in siblings:
        sp = sp_by_product_id.get(s.id)
        if sp:
            result.append(
                schemas.VendorSiblingOut(
                    supplier_product_id=sp.id,
                    product_id=s.id,
                    department_id=s.department_id,
                    department_name=s.department.name,
                )
            )
    return result

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"detail": "Deleted"}


@router.post("/supplier-products", response_model=schemas.SupplierProductOut)
def create_supplier_product(payload: schemas.SupplierProductCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.SupplierProduct)
        .filter(
            models.SupplierProduct.supplier_id == payload.supplier_id,
            models.SupplierProduct.product_id == payload.product_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This vendor already has a price for this item. Edit it instead of creating a new one.",
        )

    total_len_or_qty, length, length_unit, width, width_unit = _resolve_dimensions(payload)

    sp = models.SupplierProduct(
        supplier_id=payload.supplier_id,
        product_id=payload.product_id,
        pricing_mode=payload.pricing_mode,
        length=length,
        length_unit=length_unit,
        width=width,
        width_unit=width_unit,
        total_price=payload.total_price,
        total_length_or_quantity=total_len_or_qty,
    )
    sp.unit_price = sp.compute_unit_price()
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return sp


@router.put("/suppliers/{supplier_id}", response_model=schemas.SupplierOut)
def update_supplier(supplier_id: int, payload: schemas.SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    clash = (
        db.query(models.Supplier)
        .filter(models.Supplier.id != supplier_id, models.Supplier.name.ilike(payload.name.strip()))
        .first()
    )
    if clash:
        raise HTTPException(status_code=400, detail="Another vendor with this name already exists")

    supplier.name = payload.name.strip()
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/supplier-products/{sp_id}", response_model=schemas.SupplierProductOut)
def update_supplier_product(
    sp_id: int,
    payload: schemas.SupplierProductUpdate,
    db: Session = Depends(get_db),
):
    sp = db.query(models.SupplierProduct).filter(models.SupplierProduct.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier-product entry not found")

    old_price = sp.total_price

    total_len_or_qty, length, length_unit, width, width_unit = _resolve_dimensions(payload)

    sp.pricing_mode = payload.pricing_mode
    sp.length = length
    sp.length_unit = length_unit
    sp.width = width
    sp.width_unit = width_unit
    sp.total_price = payload.total_price
    sp.total_length_or_quantity = total_len_or_qty
    sp.unit_price = sp.compute_unit_price()

    if payload.total_price != old_price:
        history_entry = models.PriceHistory(
            supplier_id=sp.supplier_id,
            product_id=sp.product_id,
            supplier_product_id=sp.id,
            old_price=old_price,
            new_price=sp.total_price,
            changed_by_admin=payload.changed_by or "staff",
        )
        db.add(history_entry)

    db.commit()
    db.refresh(sp)
    return sp


@router.get("/supplier-products/{sp_id}/history", response_model=list[schemas.PriceHistoryOut])
def get_price_history(sp_id: int, db: Session = Depends(get_db)):
    sp = db.query(models.SupplierProduct).filter(models.SupplierProduct.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier-product entry not found")

    history = (
        db.query(models.PriceHistory)
        .filter(models.PriceHistory.supplier_product_id == sp_id)
        .order_by(models.PriceHistory.timestamp.desc())
        .all()
    )
    return history


@router.delete("/supplier-products/{sp_id}")
def delete_supplier_product(sp_id: int, db: Session = Depends(get_db)):
    sp = db.query(models.SupplierProduct).filter(models.SupplierProduct.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier-product entry not found")
    db.delete(sp)
    db.commit()
    return {"detail": "Deleted"}
