import { useEffect, useState, useCallback } from 'react'
import { Building2, Package, Tag, CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react'
import {
  getSuppliers,
  getCategories,
  getPriceMatrix,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteProduct,
} from '../api/endpoints'
import ConfirmDialog from './ConfirmDialog'
import RowActionsMenu from './RowActionsMenu'
import RenameModal from './RenameModal'
import EditItemModal from './EditItemModal'

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
 * Manage tab: housekeeping only now (rename/delete vendors, categories,
 * items; quick-add a vendor or category). Creating new items with a price
 * lives in the "+ New Product" button on the nav bar (CreateProductModal).
 *
 * Every row's Edit/Delete lives behind a three-dot menu instead of a bare
 * icon in the row, so a destructive action is never one accidental tap
 * away.
 */
export default function AdminPanel() {
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])

  const refreshLookups = useCallback(() => {
    getSuppliers().then(({ data }) => setSuppliers(data))
    getCategories().then(({ data }) => setCategories(data))
    getPriceMatrix(null, null).then(({ data }) => {
      // Keep the full row shape (not just a flattened label) so Edit can
      // open EditItemModal with everything it needs.
      const flat = data.rows.map((r) => ({
        product_id: r.product_id,
        product_name: r.product_name,
        variant_code_or_size: r.variant_code_or_size,
        department_name: r.department_name,
        category_id: r.category_id,
        category_name: r.category_name,
      }))
      setProducts(flat)
    })
  }, [])

  useEffect(() => {
    refreshLookups()
  }, [refreshLookups])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <VendorManageCard suppliers={suppliers} onChanged={refreshLookups} />
      <CategoryManageCard categories={categories} onChanged={refreshLookups} />
      <ItemManageCard products={products} onChanged={refreshLookups} />
    </div>
  )
}

function VendorManageCard({ suppliers, onChanged }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      await createSupplier(name.trim())
      setNotice({ type: 'success', message: `Vendor "${name.trim()}" added.` })
      setName('')
      onChanged()
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
      onChanged()
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.detail || 'Failed to delete vendor.' })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleRename = async (newName) => {
    await updateSupplier(editing.id, newName)
    setNotice({ type: 'success', message: `Vendor renamed to "${newName}".` })
    setEditing(null)
    onChanged()
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
            <RowActionsMenu
              label={s.name}
              onEdit={() => setEditing(s)}
              onDelete={() => setPendingDelete(s)}
            />
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

      {editing && (
        <RenameModal
          title="Rename Vendor"
          initialName={editing.name}
          onClose={() => setEditing(null)}
          onSave={handleRename}
        />
      )}
    </div>
  )
}

function CategoryManageCard({ categories, onChanged }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      await createCategory(name.trim())
      setNotice({ type: 'success', message: `Category "${name.trim()}" added.` })
      setName('')
      onChanged()
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.detail || 'Failed to add category.' })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteCategory(pendingDelete.id)
      setNotice({ type: 'success', message: `Category "${pendingDelete.name}" deleted.` })
      setPendingDelete(null)
      onChanged()
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.detail || 'Failed to delete category.' })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleRename = async (newName) => {
    await updateCategory(editing.id, newName)
    setNotice({ type: 'success', message: `Category renamed to "${newName}".` })
    setEditing(null)
    onChanged()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Tag size={18} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Categories</h2>
      </div>

      <Notice notice={notice} />

      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add category by name..."
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
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
            <span className="text-gray-800">{c.name}</span>
            <RowActionsMenu
              label={c.name}
              onEdit={() => setEditing(c)}
              onDelete={() => setPendingDelete(c)}
            />
          </li>
        ))}
        {categories.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">No categories yet.</p>}
      </ul>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this category?"
        message={
          pendingDelete
            ? `This will remove "${pendingDelete.name}" as a category. Items already assigned to it will keep showing but without a category label.`
            : ''
        }
        confirmLabel="Yes, delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {editing && (
        <RenameModal
          title="Rename Category"
          initialName={editing.name}
          onClose={() => setEditing(null)}
          onSave={handleRename}
        />
      )}
    </div>
  )
}

function ItemManageCard({ products, onChanged }) {
  const [notice, setNotice] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteProduct(pendingDelete.product_id)
      setNotice({ type: 'success', message: `Item "${pendingDelete.product_name}" deleted.` })
      setPendingDelete(null)
      onChanged()
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
          <li key={p.product_id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
            <span className="truncate pr-2 text-gray-800">
              {p.product_name}
              {p.variant_code_or_size ? ` - ${p.variant_code_or_size}` : ''}{' '}
              <span className="text-gray-400">({p.department_name})</span>
            </span>
            <RowActionsMenu
              label={p.product_name}
              onEdit={() => setEditing(p)}
              onDelete={() => setPendingDelete(p)}
            />
          </li>
        ))}
        {products.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">No items yet.</p>}
      </ul>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this item?"
        message={pendingDelete ? `This will permanently delete "${pendingDelete.product_name}" along with all vendor prices and price history for it. This cannot be undone.` : ''}
        confirmLabel="Yes, delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {editing && (
        <EditItemModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setNotice({ type: 'success', message: `Item "${editing.product_name}" updated.` })
            onChanged()
          }}
        />
      )}
    </div>
  )
}