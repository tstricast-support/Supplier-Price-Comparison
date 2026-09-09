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
  // Products grouped by name+variant across departments, so "Add Price Entry"
  // can apply one price to every department that product exists in at once.
  const [groupedProducts, setGroupedProducts] = useState([])

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

      // Group rows that share the same name + variant across departments,
      // e.g. "cold laminate 11" in both "ilab" and "i_photobook" become one
      // group with two product ids.
      const groups = new Map()
      data.rows.forEach((r) => {
        const key = `${r.product_name}|||${r.variant_code_or_size || ''}`
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            label: `${r.product_name}${r.variant_code_or_size ? ' — ' + r.variant_code_or_size : ''}`,
            productIds: [],
            departmentNames: [],
          })
        }
        const g = groups.get(key)
        g.productIds.push(r.product_id)
        g.departmentNames.push(r.department_name)
      })
      setGroupedProducts(Array.from(groups.values()))
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
        products={groupedProducts}
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
  const [departmentIds, setDepartmentIds] = useState([]) // now an array
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const toggleDepartment = (id) => {
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (departmentIds.length === 0) {
      setNotice({ type: 'error', message: 'Select at least one department.' })
      return
    }

    setSaving(true)
    setNotice(null)

    // Create one Product row per selected department — the schema already
    // allows the same name+variant to exist in multiple departments, since
    // the uniqueness constraint is (name, variant, department_id) together.
    const results = await Promise.allSettled(
      departmentIds.map((deptId) =>
        createProduct({
          name: name.trim(),
          variant_code_or_size: variant.trim() || null,
          department_id: Number(deptId),
        })
      )
    )

    const failed = results.filter((r) => r.status === 'rejected')
    const succeeded = results.length - failed.length

    if (failed.length === 0) {
      setNotice({
        type: 'success',
        message: `"${name.trim()}" added to ${succeeded} department${succeeded > 1 ? 's' : ''}.`,
      })
      setName('')
      setVariant('')
      setDepartmentIds([])
    } else if (succeeded > 0) {
      setNotice({
        type: 'error',
        message: `Added to ${succeeded} department(s), but ${failed.length} failed (likely already exists there).`,
      })
    } else {
      setNotice({
        type: 'error',
        message: failed[0].reason?.response?.data?.detail || 'Failed to add product.',
      })
    }

    onCreated()
    setSaving(false)
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Departments <span className="font-normal text-gray-400">(select one or more)</span>
          </label>
          <div className="space-y-1.5 rounded-lg border border-gray-300 p-2">
            {departments.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={departmentIds.includes(String(d.id))}
                  onChange={() => toggleDepartment(String(d.id))}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-gray-800">{d.name}</span>
              </label>
            ))}
            {departments.length === 0 && (
              <p className="px-1.5 py-1 text-xs text-gray-400">No departments available.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim() || departmentIds.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <PlusCircle size={16} />
          {saving ? 'Adding...' : `Add Product${departmentIds.length > 1 ? ` to ${departmentIds.length} Departments` : ''}`}
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
// `products` here is the GROUPED list from AdminPanel: one entry per
// name+variant, each carrying every department's product_id it exists under.
// Submitting creates the price for ALL of those departments in one go, so a
// product added to multiple departments shows a filled-in Matrix comparison
// for every department right away instead of only the one you happened to
// pick in the dropdown.

function AddPriceCard({ suppliers, products, onCreated }) {
  const [supplierId, setSupplierId] = useState('')
  const [productKey, setProductKey] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!supplierId && suppliers.length > 0) setSupplierId(String(suppliers[0].id))
  }, [suppliers, supplierId])

  useEffect(() => {
    if (!productKey && products.length > 0) setProductKey(products[0].key)
  }, [products, productKey])

  // Reset selection if the currently selected group disappears (e.g. deleted)
  useEffect(() => {
    if (productKey && !products.some((p) => p.key === productKey)) {
      setProductKey(products.length > 0 ? products[0].key : '')
    }
  }, [products, productKey])

  const selectedGroup = products.find((p) => p.key === productKey)

  const unitPreview =
    totalPrice && qty && Number(qty) > 0 ? (Number(totalPrice) / Number(qty)).toFixed(4) : '-'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const group = products.find((p) => p.key === productKey)
    if (!group) return

    setSaving(true)
    setNotice(null)

    // Fire one create per department this product exists in, same pattern
    // AddProductCard uses above.
    const results = await Promise.allSettled(
      group.productIds.map((pid) =>
        createSupplierProduct({
          supplier_id: Number(supplierId),
          product_id: pid,
          total_price: Number(totalPrice),
          total_length_or_quantity: Number(qty),
        })
      )
    )

    const failed = results.filter((r) => r.status === 'rejected')
    const succeeded = results.length - failed.length

    if (failed.length === 0) {
      setNotice({
        type: 'success',
        message: `Price added for "${group.label}" across ${succeeded} department${succeeded > 1 ? 's' : ''}.`,
      })
      setTotalPrice('')
      setQty('')
    } else if (succeeded > 0) {
      setNotice({
        type: 'error',
        message: `Added for ${succeeded} department(s); ${failed.length} already had a price for this supplier — edit those from the Matrix or Supplier view instead.`,
      })
    } else {
      setNotice({
        type: 'error',
        message: failed[0].reason?.response?.data?.detail || 'Failed to add price entry.',
      })
    }

    onCreated()
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Tags size={18} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Add Price Entry</h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Link an existing supplier to an existing product with a price. If the product
        exists in multiple departments, this price is applied to all of them at once.
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
            value={productKey}
            onChange={(e) => setProductKey(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {products.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
                {p.productIds.length > 1 ? ` (${p.productIds.length} departments)` : ''}
              </option>
            ))}
          </select>
          {selectedGroup && selectedGroup.productIds.length > 1 && (
            <p className="mt-1 text-xs text-gray-500">
              Applies to: {selectedGroup.departmentNames.join(', ')}
            </p>
          )}
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
          disabled={saving || !supplierId || !productKey}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <PlusCircle size={16} />
          {saving ? 'Adding...' : 'Add Price Entry'}
        </button>
      </form>
    </div>
  )
}