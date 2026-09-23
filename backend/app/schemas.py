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
    parent_id: Optional[int] = None


class ProductCreate(BaseModel):
    name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
    category_id: int


class ProductUpdate(BaseModel):
    name: str
    variant_code_or_size: Optional[str] = None
    department_id: int
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
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None


class SupplierCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None



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
    category_id: Optional[int] = None
    pricing_mode: str
    length: Optional[float] = None
    length_unit: Optional[str] = None
    width: Optional[float] = None
    width_unit: Optional[str] = None
    total_price: float
    total_length_or_quantity: float
    unit_price: float
    subitems: List["SubitemGroupOut"] = []


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
    supplier_id: int
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


# ---------- Subitems (an item nested inside another item) ----------

class SubitemCreate(SupplierProductBase):
    """
    Creates a subitem (a new Product with parent_id set) AND its first
    vendor price in one call. The vendor is supplied by the caller - in
    practice, whatever vendor context the create-subitem action was
    triggered from (e.g. the vendor already selected in the price-edit
    form, or a vendor picker shown when there's no such context yet).
    """
    name: str
    variant_code_or_size: Optional[str] = None
    supplier_id: int


class SubitemDetailOut(BaseModel):
    product: ProductOut
    supplier_product: SupplierProductOut


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


class SubitemGroupOut(BaseModel):
    """One subitem plus every vendor price it currently has, for display
    under its parent item (e.g. inside the price-edit form)."""
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    vendors: List[VendorOfferOut] = []


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

class DepartmentCategoryOut(BaseModel):
    category_id: int
    category_name: str
    item_count: int


class DepartmentCategoryItemsResponse(BaseModel):
    department: DepartmentOut
    category: CategoryOut
    items: List[ItemSummaryOut]


class ItemVendorsResponse(BaseModel):
    product: ProductOut
    department_name: str
    vendors: List[VendorOfferOut]


class DeptCategoryItemGroupOut(BaseModel):
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    vendors: List[VendorOfferOut] = []
    subitems: List[SubitemGroupOut] = []


class DepartmentCategoryVendorItemsResponse(BaseModel):
    department: DepartmentOut
    category: CategoryOut
    items: List[DeptCategoryItemGroupOut]


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

class CategoryVendorItemOut(BaseModel):
    supplier_product_id: int
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    supplier_id: int
    supplier_name: str
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
    subitems: List["SubitemGroupOut"] = []


class CategoryVendorItemsResponse(BaseModel):
    category: CategoryOut
    items: List[CategoryVendorItemOut]


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

# ---------- Global Search ----------

class SearchCategoryOut(BaseModel):
    id: int
    name: str


class SearchVendorOut(BaseModel):
    id: int
    name: str


class SearchItemOut(BaseModel):
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None


class GlobalSearchResponse(BaseModel):
    categories: List[SearchCategoryOut]
    vendors: List[SearchVendorOut]
    items: List[SearchItemOut]

# ---------- Purchase Orders ----------
 
class DepartmentPOProfileOut(BaseModel):
    """Letterhead for one department - drives the logo/company block on the PO."""
    department_id: int
    department_name: str
    po_prefix: str
    company_name: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    contact_person: Optional[str] = None
    logo_text: Optional[str] = None
    logo_color: Optional[str] = None
    logo_url: Optional[str] = None
 
 
class POItemVendorOut(BaseModel):
    supplier_product_id: int
    supplier_id: int
    supplier_name: str
    pricing_mode: str
    unit_price: float
    total_price: float
    total_length_or_quantity: float
    is_cheapest: bool = False
    po_unit_price: float
 
 
class POItemOptionOut(BaseModel):
    """One pickable line-item in the Create PO form, scoped to a department."""
    product_id: int
    product_name: str
    variant_code_or_size: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    parent_name: Optional[str] = None  # set when this row is a subitem
    vendors: List[POItemVendorOut] = []
 
 
class PurchaseOrderLineCreate(BaseModel):
    product_id: Optional[int] = None
    supplier_product_id: Optional[int] = None
    item_no: Optional[str] = None
    description: str
    qty: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
 
 
class PurchaseOrderCreate(BaseModel):
    department_id: int
    supplier_id: Optional[int] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    po_number: Optional[str] = None
    customer_no: Optional[str] = None
    bill_to: Optional[str] = None
    ship_to: Optional[str] = None
    shipping_method: Optional[str] = None
    shipping_terms: Optional[str] = None
    ship_via: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_date: Optional[str] = None
    remarks: Optional[str] = None
    discount: float = 0.0
    tax_rate: float = 0.0
    shipping_handling: float = 0.0
    other: float = 0.0
    show_item_no: bool = False
    lines: List[PurchaseOrderLineCreate] = []
 
 
class PurchaseOrderLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position: int
    product_id: Optional[int] = None
    supplier_product_id: Optional[int] = None
    item_no: Optional[str] = None
    description: str
    qty: float
    unit_price: float
    line_total: float
 
 
class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    po_number: str
    department_id: int
    po_date: datetime
    customer_no: Optional[str] = None
 
    company_name: str
    company_address_line1: Optional[str] = None
    company_address_line2: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_website: Optional[str] = None
    company_contact: Optional[str] = None
    logo_text: Optional[str] = None
    logo_color: Optional[str] = None
    logo_url: Optional[str] = None
 
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    department_name: Optional[str] = None
    bill_to: Optional[str] = None
    ship_to: Optional[str] = None
 
    shipping_method: Optional[str] = None
    shipping_terms: Optional[str] = None
    ship_via: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_date: Optional[str] = None
    remarks: Optional[str] = None
    show_item_no: bool = False
 
    subtotal: float
    discount: float
    subtotal_less_discount: float
    tax_rate: float
    total_tax: float
    shipping_handling: float
    other: float
    total: float
 
    lines: List[PurchaseOrderLineOut] = []
 
 
class PurchaseOrderSummaryOut(BaseModel):
    """Row in the PO list under a department."""
    id: int
    po_number: str
    po_date: datetime
    department_id: int
    department_name: str
    supplier_name: Optional[str] = None
    supplier_phone: Optional[str] = None
    line_count: int
    total: float
 