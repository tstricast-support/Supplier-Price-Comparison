from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search", response_model=schemas.GlobalSearchResponse)
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """
    Global search bar (top of every page): matches categories, vendors, and
    items by name (items also match on variant/size). Capped per group so
    the dropdown stays short and fast.
    """
    like = f"%{q.strip()}%"

    categories = (
        db.query(models.Category)
        .filter(models.Category.name.ilike(like))
        .order_by(models.Category.name)
        .limit(8)
        .all()
    )

    vendors = (
        db.query(models.Supplier)
        .filter(models.Supplier.name.ilike(like))
        .order_by(models.Supplier.name)
        .limit(8)
        .all()
    )

    products = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(
            or_(
                models.Product.name.ilike(like),
                models.Product.variant_code_or_size.ilike(like),
            )
        )
        .order_by(models.Product.name)
        .limit(20)
        .all()
    )

    # Dedup by (name, variant) - the same item can exist as several Product
    # rows across departments; the dropdown only needs one link per item.
    seen = set()
    item_results = []
    for p in products:
        key = (p.name, p.variant_code_or_size)
        if key in seen:
            continue
        seen.add(key)
        item_results.append(
            schemas.SearchItemOut(
                product_id=p.id,
                product_name=p.name,
                variant_code_or_size=p.variant_code_or_size,
                category_id=p.category_id,
                category_name=p.category.name if p.category else None,
            )
        )
        if len(item_results) >= 10:
            break

    return schemas.GlobalSearchResponse(
        categories=[schemas.SearchCategoryOut(id=c.id, name=c.name) for c in categories],
        vendors=[schemas.SearchVendorOut(id=v.id, name=v.name) for v in vendors],
        items=item_results,
    )