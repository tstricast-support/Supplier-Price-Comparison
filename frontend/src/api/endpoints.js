import api from './client'

// ---- Departments ----
export const getDepartments = () => api.get('/api/departments')

export const getDepartmentCategories = (departmentId) =>
  api.get(`/api/departments/${departmentId}/categories`)

export const getDepartmentCategoryItems = (departmentId, categoryId) =>
  api.get(`/api/departments/${departmentId}/categories/${categoryId}/items`)

// ---- Browse flow: Department -> Items -> Vendors ----

export const getDepartmentItems = (departmentId) =>
  api.get(`/api/departments/${departmentId}/items`)

export const getDepartmentCategoryVendorItems = (departmentId, categoryId) =>
  api.get(`/api/departments/${departmentId}/categories/${categoryId}/vendor-items`)

export const getItemVendors = (productId) =>
  api.get(`/api/items/${productId}/vendors`)

// ---- Items tab: Category -> Items ----
export const getCategoryItems = (categoryId) =>
  api.get(`/api/categories/${categoryId}/items`)

// ---- Items tab: Category -> flat item+vendor list ----
export const getCategoryVendorItems = (categoryId) =>
  api.get(`/api/categories/${categoryId}/vendor-items`)

// ---- Legacy matrix (still used by the Manage tab's product picker) ----
export const getPriceMatrix = (departmentId, search) =>
  api.get('/api/price-matrix', {
    params: {
      department_id: departmentId || undefined,
      search: search || undefined,
    },
  })

// ---- Vendors (suppliers) ----
export const getSuppliers = () => api.get('/api/suppliers')

export const getSupplierCategories = (supplierId) =>
  api.get(`/api/suppliers/${supplierId}/categories`)

export const getSupplierCategoryItems = (supplierId, categoryId) =>
  api.get(`/api/suppliers/${supplierId}/categories/${categoryId}/items`)

export const getSupplierProducts = (supplierId) =>
  api.get(`/api/suppliers/${supplierId}/products`)

export const createSupplier = (payload) =>
  api.post('/api/admin/suppliers', payload)

export const updateSupplier = (supplierId, payload) =>
  api.put(`/api/admin/suppliers/${supplierId}`, payload)


export const deleteSupplier = (supplierId) =>
  api.delete(`/api/admin/suppliers/${supplierId}`)

// ---- Categories ----
export const getCategories = () => api.get('/api/categories')

export const createCategory = (name) =>
  api.post('/api/admin/categories', { name })

export const updateCategory = (categoryId, name) =>
  api.put(`/api/admin/categories/${categoryId}`, { name })

export const deleteCategory = (categoryId) =>
  api.delete(`/api/admin/categories/${categoryId}`)

// ---- Products (items) ----
export const createProduct = (payload) =>
  api.post('/api/admin/products', payload)

export const updateProduct = (productId, payload) =>
  api.put(`/api/admin/products/${productId}`, payload)

export const deleteProduct = (productId) =>
  api.delete(`/api/admin/products/${productId}`)

export const getProductSiblings = (productId, supplierId) =>
  api.get(`/api/admin/products/${productId}/siblings`, {
    params: { supplier_id: supplierId || undefined },
  })

export const getVendorSiblings = (productId, supplierId) =>
  api.get(`/api/admin/products/${productId}/vendor-siblings`, {
    params: { supplier_id: supplierId },
  })

// ---- Subitems (an item nested inside another item) ----
export const createSubitem = (parentProductId, payload) =>
  api.post(`/api/admin/products/${parentProductId}/subitems`, payload)

export const getSubitems = (productId) =>
  api.get(`/api/admin/products/${productId}/subitems`)

// ---- Price entries (open access, no login required) ----
export const createSupplierProduct = (payload) =>
  api.post('/api/admin/supplier-products', payload)

export const updateSupplierProduct = (spId, payload) =>
  api.put(`/api/admin/supplier-products/${spId}`, payload)

export const getPriceHistory = (spId) =>
  api.get(`/api/admin/supplier-products/${spId}/history`)

// ---- Global search ----
export const globalSearch = (q) => api.get('/api/search', { params: { q } })



export const getDepartmentPOProfile = (departmentId) =>
  api.get(`/api/departments/${departmentId}/po-profile`)
 
export const getPOItems = (departmentId, supplierId) =>
  api.get(`/api/departments/${departmentId}/po-items`, {
    params: { supplier_id: supplierId || undefined },
  })
 
export const getPurchaseOrders = (departmentId, search) =>
  api.get('/api/purchase-orders', {
    params: {
      department_id: departmentId || undefined,
      search: search || undefined,
    },
  })
 
export const getPurchaseOrder = (poId) => api.get(`/api/purchase-orders/${poId}`)
 
export const createPurchaseOrder = (payload) =>
  api.post('/api/purchase-orders', payload)

export const updatePurchaseOrder = (poId, payload) =>
  api.put(`/api/purchase-orders/${poId}`, payload)
 
export const deletePurchaseOrder = (poId) =>
  api.delete(`/api/purchase-orders/${poId}`)