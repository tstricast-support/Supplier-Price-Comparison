import api from './client'

// ---- Departments ----
export const getDepartments = () => api.get('/api/departments')

// ---- Browse flow: Department -> Items -> Vendors ----
export const getDepartmentItems = (departmentId) =>
  api.get(`/api/departments/${departmentId}/items`)

export const getItemVendors = (productId) =>
  api.get(`/api/items/${productId}/vendors`)

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

export const getSupplierProducts = (supplierId) =>
  api.get(`/api/suppliers/${supplierId}/products`)

export const createSupplier = (name) =>
  api.post('/api/admin/suppliers', { name })

export const deleteSupplier = (supplierId) =>
  api.delete(`/api/admin/suppliers/${supplierId}`)

// ---- Products (items) ----
export const createProduct = (payload) =>
  api.post('/api/admin/products', payload)

export const updateProduct = (productId, payload) =>
  api.put(`/api/admin/products/${productId}`, payload)

export const deleteProduct = (productId) =>
  api.delete(`/api/admin/products/${productId}`)

// ---- Price entries (open access, no login required) ----
export const createSupplierProduct = (payload) =>
  api.post('/api/admin/supplier-products', payload)

export const updateSupplierProduct = (spId, payload) =>
  api.put(`/api/admin/supplier-products/${spId}`, payload)

export const getPriceHistory = (spId) =>
  api.get(`/api/admin/supplier-products/${spId}/history`)
