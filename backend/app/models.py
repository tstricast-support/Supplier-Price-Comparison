from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    # tricast, ilab, i_photobook, ilab_std
    name = Column(String(100), unique=True, nullable=False, index=True)

    products = relationship("Product", back_populates="department", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    variant_code_or_size = Column(String(100), nullable=True)  # e.g. "30m", "A4", size code
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)

    department = relationship("Department", back_populates="products")
    supplier_products = relationship(
        "SupplierProduct", back_populates="product", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("name", "variant_code_or_size", "department_id", name="uq_product_variant_dept"),
    )


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)

    supplier_products = relationship(
        "SupplierProduct", back_populates="supplier", cascade="all, delete-orphan"
    )


class SupplierProduct(Base):
    """The matrix mapping: one row per (supplier, product) price offering."""
    __tablename__ = "supplier_products"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    total_price = Column(Float, nullable=False)
    total_length_or_quantity = Column(Float, nullable=False)  # e.g. 30 (meters), 100 (units)

    # unit_price is derived (total_price / total_length_or_quantity) but persisted
    # so it can be indexed/sorted efficiently and audited historically.
    unit_price = Column(Float, nullable=False)

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    supplier = relationship("Supplier", back_populates="supplier_products")
    product = relationship("Product", back_populates="supplier_products")
    history = relationship(
        "PriceHistory", back_populates="supplier_product", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("supplier_id", "product_id", name="uq_supplier_product"),
    )

    def compute_unit_price(self) -> float:
        if not self.total_length_or_quantity:
            return 0.0
        return round(self.total_price / self.total_length_or_quantity, 4)


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    supplier_product_id = Column(Integer, ForeignKey("supplier_products.id", ondelete="CASCADE"), nullable=False)

    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    # Free-text label for who made the change. No login system, so this defaults
    # to a generic tag; pass `changed_by` in the update request to customize it.
    changed_by_admin = Column(String(100), nullable=False, default="staff")
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    supplier_product = relationship("SupplierProduct", back_populates="history")