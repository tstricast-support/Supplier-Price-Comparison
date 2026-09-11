from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator


# ---------- Departments ----------

class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: Optional[str] = None


# ---------- Categories ----------

class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str

# ---------- Products ----------

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
    category_id: Optional[int] = None
    category_name: Optional[str] = None


class ProductCreate(BaseModel):
    name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
    category_id: int


class ProductUpdate(BaseModel):
    name: str
    variant_code_or_size: Optional[str] = None
    category_id: int


class ProductSiblingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
    department_name: str


class VendorSiblingOut(BaseModel):
    supplier_product_id: int
    product_id: int
    department_id: int
    department_name: str


# ---------- Suppliers (Vendors) ----------

class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class SupplierCreate(BaseModel):
    name: str

class SupplierUpdate(BaseModel):
    name: str




class SupplierCategoryOut(BaseModel):
    category_id: int
    category_name: str
    item_count: int


class SupplierCategoryItemOut(BaseModel):
    supplier_product_id: int
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
    department_name: str
    pricing_mode: str
    length: Optional[float] = None
    length_unit: Optional[str] = None
    width: Optional[float] = None
    width_unit: Optional[str] = None
    total_price: float
    total_length_or_quantity: float
    unit_price: float


class SupplierCategoryItemsResponse(BaseModel):
    supplier: SupplierOut
    category: CategoryOut
    items: List[SupplierCategoryItemOut]


# ---------- SupplierProduct (matrix cell / vendor offer) ----------

PricingMode = Literal["quantity", "sq_inch", "sq_feet"]
LengthUnit = Literal["in", "ft", "m", "cm"]


class SupplierProductBase(BaseModel):
    pricing_mode: PricingMode = "quantity"
    total_price: float = Field(..., gt=0)
    quantity: Optional[float] = Field(None, gt=0)
    length: Optional[float] = Field(None, gt=0)
    length_unit: Optional[LengthUnit] = None
    width: Optional[float] = Field(None, gt=0)
    width_unit: Optional[LengthUnit] = None

    @model_validator(mode="after")
    def check_fields_for_mode(self):
        if self.pricing_mode == "quantity":
            if self.quantity is None:
                raise ValueError("quantity is required when pricing_mode is 'quantity'")
        else:
            if self.length is None or self.width is None:
                raise ValueError(
                    "length and width are required when pricing_mode is 'sq_inch' or 'sq_feet'"
                )
            if self.length_unit is None or self.width_unit is None:
                raise ValueError(
                    "length_unit and width_unit are required when pricing_mode is "
                    "'sq_inch' or 'sq_feet'"
                )
        return self


class SupplierProductCreate(SupplierProductBase):
    supplier_id: int
    product_id: int


class SupplierProductUpdate(SupplierProductBase):
    changed_by: Optional[str] = None


class SupplierProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: int
    product_id: int
    pricing_mode: str
    length: Optional[float] = None
    length_unit: Optional[str] = None
    width: Optional[float] = None
    width_unit: Optional[str] = None
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


# ---------- Matrix View (legacy, still used internally) ----------

class MatrixCell(BaseModel):
    supplier_product_id: int
    supplier_id: int
    supplier_name: str
    pricing_mode: str
    length: Optional[float] = None
    length_unit: Optional[str] = None
    width: Optional[float] = None
    width_unit: Optional[str] = None
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
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    cheapest_unit_price: Optional[float] = None
    offers: List[MatrixCell] = []


class MatrixResponse(BaseModel):
    suppliers: List[SupplierOut]
    rows: List[MatrixRow]


# ---------- Navigation (Department -> Items -> Vendors drill-down) ----------

class ItemSummaryOut(BaseModel):
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
    department_name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    vendor_count: int
    cheapest_unit_price: Optional[float] = None


class DepartmentItemsResponse(BaseModel):
    department: DepartmentOut
    items: List[ItemSummaryOut]


class VendorOfferOut(BaseModel):
    supplier_product_id: int
    supplier_id: int
    supplier_name: str
    pricing_mode: str
    length: Optional[float] = None
    length_unit: Optional[str] = None
    width: Optional[float] = None
    width_unit: Optional[str] = None
    total_price: float
    total_length_or_quantity: float
    unit_price: float
    is_cheapest: bool = False


class ItemVendorsResponse(BaseModel):
    product: ProductOut
    department_name: str
    vendors: List[VendorOfferOut]


# ---------- Items Tab (Category -> unique items across departments -> merged vendors) ----------

class CategoryItemOut(BaseModel):
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    department_count: int
    vendor_count: int
    cheapest_unit_price: Optional[float] = None


class CategoryItemsResponse(BaseModel):
    category: CategoryOut
    items: List[CategoryItemOut]


class MergedVendorOfferOut(BaseModel):
    supplier_product_id: int
    supplier_id: int
    supplier_name: str
    product_id: int
    department_id: int
    department_name: str
    pricing_mode: str
    length: Optional[float] = None
    length_unit: Optional[str] = None
    width: Optional[float] = None
    width_unit: Optional[str] = None
    total_price: float
    total_length_or_quantity: float
    unit_price: float
    is_cheapest: bool = False


class ItemAllVendorsResponse(BaseModel):
    product_name: str
    variant_code_or_size: Optional[str] = None
    vendors: List[MergedVendorOfferOut]