import api from './client'

// ---- Departments ----
export const getDepartments = () => api.get('/api/departments')

// ---- Browse flow: Department -> Items -> Vendors ----

export const getDepartmentItems = (departmentId) =>
  api.get(`/api/departments/${departmentId}/items`)

export const getItemVendors = (productId) =>
  api.get(`/api/items/${productId}/vendors`)

// ---- Items tab: Category -> Items ----
export const getCategoryItems = (categoryId) =>
  api.get(`/api/categories/${categoryId}/items`)

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

export const createSupplier = (name) =>
  api.post('/api/admin/suppliers', { name })


export const updateSupplier = (supplierId, name) =>
  api.put(`/api/admin/suppliers/${supplierId}`, { name })

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

// ---- Price entries (open access, no login required) ----
export const createSupplierProduct = (payload) =>
  api.post('/api/admin/supplier-products', payload)

export const updateSupplierProduct = (spId, payload) =>
  api.put(`/api/admin/supplier-products/${spId}`, payload)

export const getPriceHistory = (spId) =>
  api.get(`/api/admin/supplier-products/${spId}/history`)
