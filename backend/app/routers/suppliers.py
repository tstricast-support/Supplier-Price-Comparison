from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("", response_model=list[schemas.SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    """All vendors, A-Z. Used to feed the searchable vendor dropdown client-side."""
    return db.query(models.Supplier).order_by(models.Supplier.name).all()

@router.get("/{supplier_id}/categories", response_model=list[schemas.SupplierCategoryOut])
def get_supplier_categories(supplier_id: int, db: Session = Depends(get_db)):
    """Categories this vendor has at least one price in, A-Z, with item counts."""
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    sp_list = (
        db.query(models.SupplierProduct)
        .options(joinedload(models.SupplierProduct.product).joinedload(models.Product.category))
        .filter(models.SupplierProduct.supplier_id == supplier_id)
        .all()
    )

    counts = {}
    for sp in sp_list:
        cat = sp.product.category
        if not cat:
            continue
        if cat.id not in counts:
            counts[cat.id] = {"category_id": cat.id, "category_name": cat.name, "item_count": 0}
        counts[cat.id]["item_count"] += 1

    return sorted(counts.values(), key=lambda c: c["category_name"])


@router.get("/{supplier_id}/categories/{category_id}/items", response_model=schemas.SupplierCategoryItemsResponse)
def get_supplier_category_items(supplier_id: int, category_id: int, db: Session = Depends(get_db)):
    """This vendor's items within one category, A-Z, with this vendor's own price."""
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    sp_list = (
        db.query(models.SupplierProduct)
        .options(joinedload(models.SupplierProduct.product).joinedload(models.Product.department))
        .join(models.Product)
        .filter(
            models.SupplierProduct.supplier_id == supplier_id,
            models.Product.category_id == category_id,
        )
        .order_by(models.Product.name)
        .all()
    )

    items = [
        schemas.SupplierCategoryItemOut(
            supplier_product_id=sp.id,
            product_id=sp.product.id,
            product_name=sp.product.name,
            variant_code_or_size=sp.product.variant_code_or_size,
            department_id=sp.product.department_id,
            department_name=sp.product.department.name,
            pricing_mode=sp.pricing_mode,
            length=sp.length,
            length_unit=sp.length_unit,
            width=sp.width,
            width_unit=sp.width_unit,
            total_price=sp.total_price,
            total_length_or_quantity=sp.total_length_or_quantity,
            unit_price=sp.unit_price,
        )
        for sp in sp_list
    ]

    return schemas.SupplierCategoryItemsResponse(
        supplier=schemas.SupplierOut.model_validate(supplier),
        category=schemas.CategoryOut.model_validate(category),
        items=items,
    )


@router.get("/{supplier_id}/products", response_model=list[schemas.SupplierProductDetailOut])
def get_supplier_products(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    items = (
        db.query(models.SupplierProduct)
        .options(
            joinedload(models.SupplierProduct.product),
            joinedload(models.SupplierProduct.supplier),
        )
        .filter(models.SupplierProduct.supplier_id == supplier_id)
        .join(models.Product)
        .order_by(models.Product.name)
        .all()
    )
    return items
