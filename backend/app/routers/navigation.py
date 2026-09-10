"""
Powers the new Browse flow:
  Department (I LAB / I PHOTOBOOK / I LAB STD / DD ENGINEERING)
    -> Items in that department, A-Z
      -> Vendors offering that item, A-Z (not sorted by price - this is a
         browsing list, not the "who's cheapest" matrix)
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
                vendor_count=len(sp_list),
                cheapest_unit_price=cheapest,
            )
        )

    return schemas.DepartmentItemsResponse(
        department=schemas.DepartmentOut.model_validate(department),
        items=items,
    )


@router.get("/items/{product_id}/vendors", response_model=schemas.ItemVendorsResponse)
def get_item_vendors(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .options(joinedload(models.Product.department))
        .filter(models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Item not found")

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
