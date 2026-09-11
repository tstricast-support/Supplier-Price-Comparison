from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api", tags=["price-matrix"])


@router.get("/departments", response_model=list[schemas.DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).order_by(models.Department.name).all()

@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name).all()


@router.get("/price-matrix", response_model=schemas.MatrixResponse)
def get_price_matrix(
    department_id: Optional[int] = Query(None, description="Filter by department"),
    search: Optional[str] = Query(None, description="Search by product name or variant/size"),
    db: Session = Depends(get_db),
):
    """
    Legacy full matrix view (kept for the Manage tab's product picker and for
    anything else that still wants the flat table). The new Browse flow uses
    the /api/departments/{id}/items and /api/items/{id}/vendors endpoints
    in navigation.py instead.
    """
    query = db.query(models.Product).options(
        joinedload(models.Product.department),
        joinedload(models.Product.category),)

    if department_id:
        query = query.filter(models.Product.department_id == department_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.Product.name.ilike(like),
                models.Product.variant_code_or_size.ilike(like),
            )
        )

    products = query.order_by(models.Product.name).all()

    all_suppliers = db.query(models.Supplier).order_by(models.Supplier.name).all()
    supplier_out = [schemas.SupplierOut.model_validate(s) for s in all_suppliers]

    rows: list[schemas.MatrixRow] = []

    for product in products:
        sp_list = (
            db.query(models.SupplierProduct)
            .options(joinedload(models.SupplierProduct.supplier))
            .filter(models.SupplierProduct.product_id == product.id)
            .all()
        )
        sp_list_sorted = sorted(sp_list, key=lambda sp: sp.unit_price)

        offers = []
        for idx, sp in enumerate(sp_list_sorted):
            offers.append(
                schemas.MatrixCell(
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
                    is_cheapest=(idx == 0),
                )
            )

        rows.append(
            schemas.MatrixRow(
                product_id=product.id,
                product_name=product.name,
                variant_code_or_size=product.variant_code_or_size,
                department_id=product.department_id,
                department_name=product.department.name,
                category_id=product.category_id,
                category_name=product.category.name if product.category else None,
                cheapest_unit_price=offers[0].unit_price if offers else None,
                offers=offers,
            )
        )

    rows.sort(key=lambda r: (r.cheapest_unit_price is None, r.cheapest_unit_price or 0))

    return schemas.MatrixResponse(suppliers=supplier_out, rows=rows)
