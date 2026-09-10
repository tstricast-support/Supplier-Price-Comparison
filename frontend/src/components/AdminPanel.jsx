import { useEffect, useState, useCallback } from 'react'
import { Building2, Package, Trash2, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  getSuppliers,
  getPriceMatrix,
  createSupplier,
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

/**
 * Manage tab: housekeeping only now (delete vendors/items, quick-add a
 * vendor). Creating new items with a price lives in the "+ New Product"
 * button on the nav bar (CreateProductModal) so it's reachable from
 * anywhere, including mid-browse.
 */
export default function AdminPanel() {
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])

  const refreshLookups = useCallback(() => {
    getSuppliers().then(({ data }) => setSuppliers(data))
    getPriceMatrix(null, null).then(({ data }) => {
      const flat = data.rows.map((r) => ({
        id: r.product_id,
        label: `${r.product_name}${r.variant_code_or_size ? ' - ' + r.variant_code_or_size : ''} (${r.department_name})`,
      }))
      setProducts(flat)
    })
  }, [])

  useEffect(() => {
    refreshLookups()
  }, [refreshLookups])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <VendorManageCard suppliers={suppliers} onCreated={refreshLookups} />
      <ItemManageCard products={products} onCreated={refreshLookups} />
    </div>
  )
}

function VendorManageCard({ suppliers, onCreated }) {
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
      setNotice({ type: 'success', message: `Vendor "${name.trim()}" added.` })
      setName('')
      onCreated()
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.detail || 'Failed to add vendor.' })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteSupplier(pendingDelete.id)
      setNotice({ type: 'success', message: `Vendor "${pendingDelete.name}" deleted.` })
      setPendingDelete(null)
      onCreated()
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.detail || 'Failed to delete vendor.' })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Building2 size={18} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Vendors</h2>
      </div>

      <Notice notice={notice} />

      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add vendor by name..."
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <PlusCircle size={15} /> Add
        </button>
      </form>

      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {suppliers.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
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
        {suppliers.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">No vendors yet.</p>}
      </ul>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this vendor?"
        message={pendingDelete ? `This will permanently delete "${pendingDelete.name}" along with all of its prices and price history. This cannot be undone.` : ''}
        confirmLabel="Yes, delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function ItemManageCard({ products, onCreated }) {
  const [notice, setNotice] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteProduct(pendingDelete.id)
      setNotice({ type: 'success', message: `Item "${pendingDelete.label}" deleted.` })
      setPendingDelete(null)
      onCreated()
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.detail || 'Failed to delete item.' })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Package size={18} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Items</h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        To add a new item, use the "+ New Product" button in the top nav bar.
      </p>

      <Notice notice={notice} />

      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
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
        {products.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">No items yet.</p>}
      </ul>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this item?"
        message={pendingDelete ? `This will permanently delete "${pendingDelete.label}" along with all vendor prices and price history for it. This cannot be undone.` : ''}
        confirmLabel="Yes, delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
