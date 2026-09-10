from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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


@router.post("/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(models.Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


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
