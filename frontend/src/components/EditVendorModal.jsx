import { useState } from 'react'
import { X, Save, Building2 } from 'lucide-react'

export default function EditVendorModal({ supplier, onClose, onSave }) {
  const [form, setForm] = useState({
    name: supplier.name || '',
    address: supplier.address || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    contact_person: supplier.contact_person || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setErr(null)
    try {
      await onSave({ ...form, name: form.name.trim() })
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to save.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">Edit Vendor</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Vendor name" value={form.name} onChange={set('name')} required autoFocus />
          <Field label="Contact person" value={form.contact_person} onChange={set('contact_person')} />
          <Field label="Phone" value={form.phone} onChange={set('phone')} />
          <Field label="Email" value={form.email} onChange={set('email')} type="email" />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
            <textarea
              rows={3}
              value={form.address}
              onChange={set('address')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, autoFocus }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}