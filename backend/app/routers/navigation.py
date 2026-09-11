"""
Powers the new Browse flow:
  Department (I LAB / I PHOTOBOOK / I LAB STD / DD ENGINEERING)
    -> Items in that department, A-Z
      -> Vendors offering that item, A-Z (not sorted by price - this is a
         browsing list, not the "who's cheapest" matrix)

Also powers the Items tab:
  Category (A-Z) -> unique items, A-Z (deduped across departments)
    -> merged vendor list across every department that item lives in
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api", tags=["navigation"])


@router.get("/departments/{department_id}/items", response_model=schemas.DepartmentItemsResponse)
def get_department_items(department_id: int, db: Session = Depends(get_db)):
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    products = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(models.Product.department_id == department_id)
        .order_by(models.Product.name, models.Product.variant_code_or_size)
        .all()
    )

    items = []
    for product in products:
        sp_list = (
            db.query(models.SupplierProduct)
            .filter(models.SupplierProduct.product_id == product.id)
            .all()
        )
        cheapest = min((sp.unit_price for sp in sp_list), default=None)
        items.append(
            schemas.ItemSummaryOut(
                product_id=product.id,
                product_name=product.name,
                variant_code_or_size=product.variant_code_or_size,
                department_id=department.id,
                department_name=department.name,
                category_id=product.category_id,
                category_name=product.category.name if product.category else None,
                vendor_count=len(sp_list),
                cheapest_unit_price=cheapest,
            )
        )

    return schemas.DepartmentItemsResponse(
        department=schemas.DepartmentOut.model_validate(department),
        items=items,
    )


@router.get("/departments/{department_id}/categories", response_model=list[schemas.DepartmentCategoryOut])
def get_department_categories(department_id: int, db: Session = Depends(get_db)):
    """Categories that have at least one item in this department, A-Z,
    with item counts. Powers Home's Department -> Category step."""
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    products = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(models.Product.department_id == department_id)
        .all()
    )

    counts = {}
    for p in products:
        if not p.category:
            continue
        if p.category.id not in counts:
            counts[p.category.id] = {
                "category_id": p.category.id,
                "category_name": p.category.name,
                "item_count": 0,
            }
        counts[p.category.id]["item_count"] += 1

    return sorted(counts.values(), key=lambda c: c["category_name"].lower())


@router.get(
    "/departments/{department_id}/categories/{category_id}/items",
    response_model=schemas.DepartmentCategoryItemsResponse,
)
def get_department_category_items(department_id: int, category_id: int, db: Session = Depends(get_db)):
    """Items within one category, scoped to one department, A-Z. Powers
    Home's Category -> Items step."""
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    products = (
        db.query(models.Product)
        .filter(
            models.Product.department_id == department_id,
            models.Product.category_id == category_id,
        )
        .order_by(models.Product.name, models.Product.variant_code_or_size)
        .all()
    )

    items = []
    for product in products:
        sp_list = (
            db.query(models.SupplierProduct)
            .filter(models.SupplierProduct.product_id == product.id)
            .all()
        )
        cheapest = min((sp.unit_price for sp in sp_list), default=None)
        items.append(
            schemas.ItemSummaryOut(
                product_id=product.id,
                product_name=product.name,
                variant_code_or_size=product.variant_code_or_size,
                department_id=department.id,
                department_name=department.name,
                category_id=category.id,
                category_name=category.name,
                vendor_count=len(sp_list),
                cheapest_unit_price=cheapest,
            )
        )

    return schemas.DepartmentCategoryItemsResponse(
        department=schemas.DepartmentOut.model_validate(department),
        category=schemas.CategoryOut.model_validate(category),
        items=items,
    )


@router.get("/items/{product_id}/vendors", response_model=schemas.ItemVendorsResponse)
def get_item_vendors(product_id: int, db: Session = Depends(get_db)):
    """Single-department vendor list (used by Home / BrowseFlow, where the
    item is already scoped to one specific department's Product row)."""
    product = (
        db.query(models.Product)
        .options(
            joinedload(models.Product.department),
            joinedload(models.Product.category),
        )
        .filter(models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Item not found")

    # ProductOut has a category_name field, but Product (the ORM model) has
    # no such attribute - only category_id and the `category` relationship.
    # Stamp it on here (same pattern used in admin.py's create/update_product)
    # so model_validate() below picks it up instead of silently defaulting
    # to None.
    product.category_name = product.category.name if product.category else None

    sp_list = (
        db.query(models.SupplierProduct)
        .options(joinedload(models.SupplierProduct.supplier))
        .filter(models.SupplierProduct.product_id == product_id)
        .join(models.Supplier)
        .order_by(models.Supplier.name)
        .all()
    )

    cheapest_id = None
    if sp_list:
        cheapest_id = min(sp_list, key=lambda sp: sp.unit_price).id

    vendors = [
        schemas.VendorOfferOut(
            supplier_product_id=sp.id,
            supplier_id=sp.supplier_id,
            supplier_name=sp.supplier.name,
            pricing_mode=sp.pricing_mode,
            length=sp.length,
            length_unit=sp.length_unit,
            width=sp.width,
            width_unit=sp.width_unit,
            total_price=sp.total_price,
            total_length_or_quantity=sp.total_length_or_quantity,
            unit_price=sp.unit_price,
            is_cheapest=(sp.id == cheapest_id),
        )
        for sp in sp_list
    ]

    return schemas.ItemVendorsResponse(
        product=schemas.ProductOut.model_validate(product),
        department_name=product.department.name,
        vendors=vendors,
    )


@router.get("/categories/{category_id}/items", response_model=schemas.CategoryItemsResponse)
def get_category_items(category_id: int, db: Session = Depends(get_db)):
    """
    Items tab: Category -> unique items, A-Z. The same item can exist as
    separate Product rows in multiple departments (created together via the
    multi-department New Product form) - those are merged into one row here,
    with vendor_count and cheapest_unit_price combined across all of them,
    so the same item never appears twice in the list.
    """
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    products = (
        db.query(models.Product)
        .filter(models.Product.category_id == category_id)
        .order_by(models.Product.name)
        .all()
    )

    # Group by (name, variant) so the same logical item, living in several
    # departments, collapses into a single row.
    groups = {}  # (name, variant) -> { representative_id, product_ids: [...] }
    for p in products:
        key = (p.name, p.variant_code_or_size)
        if key not in groups:
            groups[key] = {"representative_id": p.id, "product_ids": [p.id]}
        else:
            groups[key]["product_ids"].append(p.id)
            groups[key]["representative_id"] = min(groups[key]["representative_id"], p.id)

    items = []
    for (name, variant), g in groups.items():
        sp_list = (
            db.query(models.SupplierProduct)
            .filter(models.SupplierProduct.product_id.in_(g["product_ids"]))
            .all()
        )
        cheapest = min((sp.unit_price for sp in sp_list), default=None)
        items.append(
            schemas.CategoryItemOut(
                product_id=g["representative_id"],
                product_name=name,
                variant_code_or_size=variant,
                department_count=len(g["product_ids"]),
                vendor_count=len(sp_list),
                cheapest_unit_price=cheapest,
            )
        )

    items.sort(key=lambda i: (i.product_name.lower(), i.variant_code_or_size or ""))

    return schemas.CategoryItemsResponse(
        category=schemas.CategoryOut.model_validate(category),
        items=items,
    )


@router.get("/items/{product_id}/all-vendors", response_model=schemas.ItemAllVendorsResponse)
def get_item_all_vendors(product_id: int, db: Session = Depends(get_db)):
    """
    Items tab: merged vendor list for an item across every department it
    exists in. `product_id` may be just one of several department copies
    (the "representative" id chosen in get_category_items) - this pulls in
    all of its siblings (same name + variant, different department) and
    combines their vendor offers into one list, each tagged with which
    department it came from.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Item not found")

    siblings = (
        db.query(models.Product)
        .filter(
            models.Product.id != product_id,
            models.Product.name == product.name,
            models.Product.variant_code_or_size == product.variant_code_or_size,
        )
        .all()
    )
    all_products = [product] + siblings
    dept_names = {p.id: p.department.name for p in all_products}
    dept_ids = {p.id: p.department_id for p in all_products}
    product_ids = [p.id for p in all_products]

    sp_list = (
        db.query(models.SupplierProduct)
        .options(joinedload(models.SupplierProduct.supplier))
        .filter(models.SupplierProduct.product_id.in_(product_ids))
        .join(models.Supplier)
        .order_by(models.Supplier.name)
        .all()
    )

    cheapest_id = None
    if sp_list:
        cheapest_id = min(sp_list, key=lambda sp: sp.unit_price).id

    vendors = [
        schemas.MergedVendorOfferOut(
            supplier_product_id=sp.id,
            supplier_id=sp.supplier_id,
            supplier_name=sp.supplier.name,
            product_id=sp.product_id,
            department_id=dept_ids[sp.product_id],
            department_name=dept_names[sp.product_id],
            pricing_mode=sp.pricing_mode,
            length=sp.length,
            length_unit=sp.length_unit,
            width=sp.width,
            width_unit=sp.width_unit,
            total_price=sp.total_price,
            total_length_or_quantity=sp.total_length_or_quantity,
            unit_price=sp.unit_price,
            is_cheapest=(sp.id == cheapest_id),
        )
        for sp in sp_list
    ]

    return schemas.ItemAllVendorsResponse(
        product_name=product.name,
        variant_code_or_size=product.variant_code_or_size,
        vendors=vendors,
    )