from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("", response_model=list[schemas.SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    """All vendors, A-Z. Used to feed the searchable vendor dropdown client-side."""
    return db.query(models.Supplier).order_by(models.Supplier.name).all()


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
