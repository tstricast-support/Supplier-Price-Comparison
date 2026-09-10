import { useState } from 'react'
import { X, Building2 } from 'lucide-react'
import { createSupplier } from '../api/endpoints'

/** Small inline modal for adding a vendor without leaving the current form. */
export default function QuickCreateVendorModal({ initialName = '', onClose, onCreated }) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setErr(null)
    try {
      const { data } = await createSupplier(name.trim())
      onCreated(data)
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to create vendor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">Create Vendor</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Vendor Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Supplier D"
              autoFocus
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create & Use This Vendor'}
          </button>
        </form>
      </div>
    </div>
  )
}
