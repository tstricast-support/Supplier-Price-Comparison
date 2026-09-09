import api from './client'

export const getDepartments = () => api.get('/api/departments')

export const getPriceMatrix = (departmentId, search) =>
  api.get('/api/price-matrix', {
    params: {
      department_id: departmentId || undefined,
      search: search || undefined,
    },
  })

export const getSuppliers = () => api.get('/api/suppliers')

export const getSupplierProducts = (supplierId) =>
  api.get(`/api/suppliers/${supplierId}/products`)

export const deleteSupplier = (supplierId) =>
  api.delete(`/api/admin/suppliers/${supplierId}`)

// --- Price management (open access, no login required) ---

export const updateSupplierProduct = (spId, payload) =>
  api.put(`/api/admin/supplier-products/${spId}`, payload)

export const getPriceHistory = (spId) =>
  api.get(`/api/admin/supplier-products/${spId}/history`)

export const createSupplier = (name) =>
  api.post('/api/admin/suppliers', { name })

export const createProduct = (payload) =>
  api.post('/api/admin/products', payload)

export const deleteProduct = (productId) =>
  api.delete(`/api/admin/products/${productId}`)

export const createSupplierProduct = (payload) =>
  api.post('/api/admin/supplier-products', payload)
