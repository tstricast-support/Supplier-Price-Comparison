from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ---------- Departments ----------

class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


# ---------- Products ----------

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    variant_code_or_size: Optional[str] = None
    department_id: int


class ProductCreate(BaseModel):
    name: str
    variant_code_or_size: Optional[str] = None
    department_id: int


# ---------- Suppliers ----------

class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class SupplierCreate(BaseModel):
    name: str


# ---------- SupplierProduct (matrix cell) ----------

class SupplierProductBase(BaseModel):
    total_price: float = Field(..., gt=0)
    total_length_or_quantity: float = Field(..., gt=0)


class SupplierProductCreate(SupplierProductBase):
    supplier_id: int
    product_id: int


class SupplierProductUpdate(BaseModel):
    """Used by the price-update endpoint. Either/both fields can be updated."""
    total_price: Optional[float] = Field(None, gt=0)
    total_length_or_quantity: Optional[float] = Field(None, gt=0)
    changed_by: Optional[str] = Field(
        None, description="Optional free-text name/label of who made this change"
    )


class SupplierProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: int
    product_id: int
    total_price: float
    total_length_or_quantity: float
    unit_price: float
    updated_at: datetime


class SupplierProductDetailOut(SupplierProductOut):
    supplier: SupplierOut
    product: ProductOut


# ---------- Price History ----------

class PriceHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: int
    product_id: int
    supplier_product_id: int
    old_price: float
    new_price: float
    changed_by_admin: str
    timestamp: datetime


# ---------- Matrix View ----------

class MatrixCell(BaseModel):
    """One supplier's offer for a given product row."""
    supplier_product_id: int
    supplier_id: int
    supplier_name: str
    total_price: float
    total_length_or_quantity: float
    unit_price: float
    is_cheapest: bool = False


class MatrixRow(BaseModel):
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
    department_name: str
    cheapest_unit_price: Optional[float] = None
    offers: List[MatrixCell] = []  # sorted ascending by unit_price


class MatrixResponse(BaseModel):
    suppliers: List[SupplierOut]  # all suppliers present in this result set (for column headers)
    rows: List[MatrixRow]
