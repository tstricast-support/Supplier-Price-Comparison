import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { updateSupplierProduct } from '../api/endpoints'
import { formatRs } from '../utils/currency'

export default function EditPriceModal({ cell, onClose, onSaved }) {
  const [totalPrice, setTotalPrice] = useState(cell?.total_price ?? '')
  const [qty, setQty] = useState(cell?.total_length_or_quantity ?? '')
  const [changedBy, setChangedBy] = useState(
    localStorage.getItem('last_editor_name') || ''
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  if (!cell) return null

  const unitPricePreview =
    totalPrice && qty && Number(qty) > 0
      ? (Number(totalPrice) / Number(qty)).toFixed(4)
      : '—'

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await updateSupplierProduct(cell.supplier_product_id, {
        total_price: Number(totalPrice),
        total_length_or_quantity: Number(qty),
        changed_by: changedBy || undefined,
      })
      if (changedBy) localStorage.setItem('last_editor_name', changedBy)
      onSaved()
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to update price.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Update Price</h2>
            <p className="text-xs text-gray-500">
              {cell.productName} — {cell.supplierName}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Total Price (Rs.)
            </label>
            <input
              type="number"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Total Length / Quantity
            </label>
            <input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Your name <span className="font-normal text-gray-400">(optional, shown in history)</span>
            </label>
            <input
              value={changedBy}
              onChange={(e) => setChangedBy(e.target.value)}
              placeholder="e.g. Jane"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Calculated unit price:{' '}
            <span className="font-semibold">{formatRs(unitPricePreview, 4)}</span>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save & Log History'}
          </button>
        </form>
      </div>
    </div>
  )
}