import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { updateProduct } from '../api/endpoints'

/**
 * Renames an item (and/or edits its variant/size). `item` = { product_id,
 * product_name, variant_code_or_size }, same shape ItemList passes around.
 */
export default function EditItemModal({ item, onClose, onSaved }) {
  const [name, setName] = useState(item.product_name)
  const [variant, setVariant] = useState(item.variant_code_or_size || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setErr(null)
    try {
      await updateProduct(item.product_id, {
        name: name.trim(),
        variant_code_or_size: variant.trim() || null,
      })
      onSaved()
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to update item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Item</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Item Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}