from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/suppliers", response_model=schemas.SupplierOut)
def create_supplier(payload: schemas.SupplierCreate, db: Session = Depends(get_db)):
    if db.query(models.Supplier).filter(models.Supplier.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Supplier already exists")
    supplier = models.Supplier(name=payload.name)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """
    Deletes a supplier and all of its price offerings (and their history)
    via cascade. Irreversible — the frontend must confirm before calling this.
    """
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
    """
    Deletes a product and all of its supplier price offerings (and their
    history) via cascade. Irreversible — the frontend must confirm before calling this.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"detail": "Deleted"}


@router.post("/supplier-products", response_model=schemas.SupplierProductOut)
def create_supplier_product(payload: schemas.SupplierProductCreate, db: Session = Depends(get_db)):
    """Create a new price offering (a new matrix cell) for a supplier+product pair."""
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
            detail="This supplier already has a price for this product. Use PUT to update it.",
        )

    sp = models.SupplierProduct(
        supplier_id=payload.supplier_id,
        product_id=payload.product_id,
        total_price=payload.total_price,
        total_length_or_quantity=payload.total_length_or_quantity,
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
    """
    Update total_price and/or total_length_or_quantity for a supplier's price
    on a product. Recomputes unit_price and automatically logs the change into
    price_history. Open access — no login required.
    """
    sp = db.query(models.SupplierProduct).filter(models.SupplierProduct.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier-product entry not found")

    old_price = sp.total_price

    if payload.total_price is not None:
        sp.total_price = payload.total_price
    if payload.total_length_or_quantity is not None:
        sp.total_length_or_quantity = payload.total_length_or_quantity

    sp.unit_price = sp.compute_unit_price()

    # Only log history if the total_price actually changed
    if payload.total_price is not None and payload.total_price != old_price:
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
    """Audit trail of price changes for one product-supplier item."""
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
