import { useEffect, useState, useCallback } from 'react'
import { PlusCircle, Building2, Package, Tags, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import {
  getDepartments,
  getSuppliers,
  getPriceMatrix,
  createSupplier,
  createProduct,
  createSupplierProduct,
  deleteSupplier,
  deleteProduct,
} from '../api/endpoints'
import ConfirmDialog from './ConfirmDialog'

function Notice({ notice }) {
  if (!notice) return null
  const isError = notice.type === 'error'
  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
        isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
      }`}
    >
      {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {notice.message}
    </div>
  )
}

export default function AdminPanel() {
  const [departments, setDepartments] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])

  // Single shared refresh so every card reflects new/deleted suppliers, products,
  // and departments immediately.
  const refreshLookups = useCallback(() => {
    getDepartments().then(({ data }) => setDepartments(data))
    getSuppliers().then(({ data }) => setSuppliers(data))
    getPriceMatrix(null, null).then(({ data }) => {
      const flat = data.rows.map((r) => ({
        id: r.product_id,
        label: `${r.product_name}${r.variant_code_or_size ? ' — ' + r.variant_code_or_size : ''} (${r.department_name})`,
      }))
      setProducts(flat)
    })
  }, [])

  useEffect(() => {
    refreshLookups()
  }, [refreshLookups])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <AddSupplierCard suppliers={suppliers} onCreated={refreshLookups} />
      <AddProductCard
        departments={departments}
        products={products}
        onCreated={refreshLookups}
      />
      <AddPriceCard
        suppliers={suppliers}
        products={products}
        onCreated={refreshLookups}
      />
    </div>
  )
}

// ---------------- Add Supplier (+ manage/delete list) ----------------

function AddSupplierCard({ suppliers, onCreated }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      await createSupplier(name.trim())
      setNotice({ type: 'success', message: `Supplier "${name.trim()}" added.` })
      setName('')
      onCreated()
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to add supplier.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteSupplier(pendingDelete.id)
      setNotice({ type: 'success', message: `Supplier "${pendingDelete.name}" deleted.` })
      setPendingDelete(null)
      onCreated()
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to delete supplier.',
      })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Building2 size={18} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Add New Supplier</h2>
      </div>

      <Notice notice={notice} />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Supplier Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Supplier D"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <PlusCircle size={16} />
          {saving ? 'Adding...' : 'Add Supplier'}
        </button>
      </form>

      {suppliers.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Existing Suppliers</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {suppliers.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="text-gray-800">{s.name}</span>
                <button
                  onClick={() => setPendingDelete(s)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this supplier?"
        message={
          pendingDelete
            ? `This will permanently delete "${pendingDelete.name}" along with all of its prices and price history. This cannot be undone.`
            : ''
        }
        confirmLabel="Yes, delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

// ---------------- Add Product (+ manage/delete list) ----------------

function AddProductCard({ departments, products, onCreated }) {
  const [name, setName] = useState('')
  const [variant, setVariant] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const [pendingDelete, setPendingDelete] = useState(null) // { id, label } or null
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!departmentId && departments.length > 0) setDepartmentId(String(departments[0].id))
  }, [departments, departmentId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      await createProduct({
        name: name.trim(),
        variant_code_or_size: variant.trim() || null,
        department_id: Number(departmentId),
      })
      setNotice({ type: 'success', message: `Product "${name.trim()}" added.` })
      setName('')
      setVariant('')
      onCreated()
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to add product.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteProduct(pendingDelete.id)
      setNotice({ type: 'success', message: `Product "${pendingDelete.label}" deleted.` })
      setPendingDelete(null)
      onCreated()
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to delete product.',
      })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Package size={18} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Add New Product</h2>
      </div>

      <Notice notice={notice} />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Product Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Canvas Roll 4702"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Variant / Size <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="e.g. 44in, A4, 30m"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim() || !departmentId}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <PlusCircle size={16} />
          {saving ? 'Adding...' : 'Add Product'}
        </button>
      </form>

      {products.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Existing Products</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="truncate pr-2 text-gray-800">{p.label}</span>
                <button
                  onClick={() => setPendingDelete(p)}
                  className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${p.label}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this product?"
        message={
          pendingDelete
            ? `This will permanently delete "${pendingDelete.label}" along with all supplier prices and price history for it. This cannot be undone.`
            : ''
        }
        confirmLabel="Yes, delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

// ---------------- Add Price Entry (link supplier + product + price) ----------------

function AddPriceCard({ suppliers, products, onCreated }) {
  const [supplierId, setSupplierId] = useState('')
  const [productId, setProductId] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!supplierId && suppliers.length > 0) setSupplierId(String(suppliers[0].id))
  }, [suppliers, supplierId])

  useEffect(() => {
    if (!productId && products.length > 0) setProductId(String(products[0].id))
  }, [products, productId])

  const unitPreview =
    totalPrice && qty && Number(qty) > 0 ? (Number(totalPrice) / Number(qty)).toFixed(4) : '-'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      await createSupplierProduct({
        supplier_id: Number(supplierId),
        product_id: Number(productId),
        total_price: Number(totalPrice),
        total_length_or_quantity: Number(qty),
      })
      setNotice({ type: 'success', message: 'Price entry added to the matrix.' })
      setTotalPrice('')
      setQty('')
      onCreated()
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to add price entry.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Tags size={18} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Add Price Entry</h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Link an existing supplier to an existing product with a price. Use this after
        creating the supplier and product above.
      </p>

      <Notice notice={notice} />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Total Price (Rs.)</label>
            <input
              type="number"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Qty / Length</label>
            <input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Unit price: <span className="font-semibold">Rs. {unitPreview}</span>
        </div>

        <button
          type="submit"
          disabled={saving || !supplierId || !productId}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <PlusCircle size={16} />
          {saving ? 'Adding...' : 'Add Price Entry'}
        </button>
      </form>
    </div>
  )
}