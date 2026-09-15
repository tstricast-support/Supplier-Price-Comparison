import { useEffect, useMemo, useState } from 'react'
import { X, Plus, Trash2, FileText } from 'lucide-react'
import {
  getDepartmentPOProfile,
  getPOItems,
  getSuppliers,
  createPurchaseOrder,
} from '../api/endpoints'
import SearchableSelect from './SearchableSelect'
import { formatRs } from '../utils/currency'

/**
 * Create a purchase order.
 *
 * The department is picked first because it drives everything else: the
 * letterhead (logo, company name, address, phone) swaps to that
 * department's profile, and the item picker is filtered to items that
 * actually live in that department.
 */
export default function CreatePOModal({ departments, defaultDepartmentId, onClose, onCreated }) {
  const [departmentId, setDepartmentId] = useState(
    defaultDepartmentId ? String(defaultDepartmentId) : ''
  )
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')

  const [lines, setLines] = useState([])
  const [pickItemId, setPickItemId] = useState('')

  const [form, setForm] = useState({
    customer_no: '',
    vendor_address: '',
    bill_to: '',
    ship_to: '',
    shipping_method: '',
    shipping_terms: '',
    ship_via: '',
    payment_terms: '',
    delivery_date: '',
    remarks: '',
    discount: '0',
    tax_rate: '0',
    shipping_handling: '0',
    other: '0',
  })

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const num = (v) => (v === '' || isNaN(Number(v)) ? 0 : Number(v))

  useEffect(() => {
    getSuppliers().then(({ data }) => setSuppliers(data)).catch(() => {})
  }, [])

  // Department change -> new letterhead, new item list, drop any lines that
  // belonged to the old department.
  useEffect(() => {
    if (!departmentId) {
      setProfile(null)
      setItems([])
      setLines([])
      return
    }
    getDepartmentPOProfile(departmentId)
      .then(({ data }) => {
        setProfile(data)
        // Bill To / Ship To describe US, the buyer - default both to this
        // department's own letterhead so the vendor knows where to invoice
        // and deliver. Only fill them if empty, so switching departments
        // twice doesn't clobber something the user already edited.
        const ourAddress = [
          data.company_name,
          data.address_line1,
          data.address_line2,
          data.phone,
          data.email,
        ]
          .filter(Boolean)
          .join('\n')
        setForm((f) => ({
          ...f,
          bill_to: f.bill_to || ourAddress,
          ship_to: f.ship_to || ourAddress,
        }))
      })
      .catch(() => setErr('Could not load the department letterhead.'))

    getPOItems(departmentId)
      .then(({ data }) => setItems(data))
      .catch(() => setErr('Could not load items for this department.'))

    setLines([])
  }, [departmentId])



  const itemOptions = useMemo(
    () =>
      items.map((it) => ({
        id: it.product_id,
        label: [
          it.parent_name ? `${it.parent_name} / ` : '',
          it.product_name,
          it.variant_code_or_size ? ` (${it.variant_code_or_size})` : '',
          it.category_name ? ` — ${it.category_name}` : '',
        ].join(''),
      })),
    [items]
  )

  const addLine = (productId) => {
    const it = items.find((i) => String(i.product_id) === String(productId))
    if (!it) return
    // Prefer the selected vendor's price, otherwise the cheapest one.
    const fromVendor = it.vendors.find((v) => String(v.supplier_id) === String(supplierId))
    const offer = fromVendor || it.vendors[0]
    setLines((ls) => [
      ...ls,
      {
        key: `${productId}-${Date.now()}`,
        product_id: it.product_id,
        supplier_product_id: offer ? offer.supplier_product_id : null,
        item_no: it.variant_code_or_size || '',
        description: [
          it.parent_name ? `${it.parent_name} / ` : '',
          it.product_name,
          it.variant_code_or_size ? ` - ${it.variant_code_or_size}` : '',
        ].join(''),
        qty: '1',
        unit_price: offer ? String(offer.unit_price) : '0',
      },
    ])
    setPickItemId('')
  }

  const updateLine = (key, field, value) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)))

  const removeLine = (key) => setLines((ls) => ls.filter((l) => l.key !== key))

  const subtotal = lines.reduce((sum, l) => sum + num(l.qty) * num(l.unit_price), 0)
  const lessDiscount = subtotal - num(form.discount)
  const totalTax = (lessDiscount * num(form.tax_rate)) / 100
  const total = lessDiscount + totalTax + num(form.shipping_handling) + num(form.other)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!departmentId) return setErr('Pick a department first.')
    if (lines.length === 0) return setErr('Add at least one item.')

    setSaving(true)
    setErr(null)
    try {
      const { data } = await createPurchaseOrder({
        department_id: Number(departmentId),
        supplier_id: supplierId ? Number(supplierId) : null,
        vendor_address: form.vendor_address || null,
        customer_no: form.customer_no || null,
        bill_to: form.bill_to || null,
        ship_to: form.ship_to || null,
        shipping_method: form.shipping_method || null,
        shipping_terms: form.shipping_terms || null,
        ship_via: form.ship_via || null,
        payment_terms: form.payment_terms || null,
        delivery_date: form.delivery_date || null,
        remarks: form.remarks || null,
        discount: num(form.discount),
        tax_rate: num(form.tax_rate),
        shipping_handling: num(form.shipping_handling),
        other: num(form.other),
        lines: lines.map((l) => ({
          product_id: l.product_id,
          supplier_product_id: l.supplier_product_id,
          item_no: l.item_no || null,
          description: l.description,
          qty: num(l.qty),
          unit_price: num(l.unit_price),
        })),
      })
      onCreated(data)
    } catch (error) {
      setErr(error.response?.data?.detail || 'Could not save the purchase order.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-6 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">New purchase order</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 px-5 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Department</label>
            <SearchableSelect
              options={departments.map((d) => ({ id: d.id, label: d.name }))}
              value={departmentId}
              onChange={setDepartmentId}
              placeholder="Pick a department"
            />
          </div>

          {profile && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div
                className="text-xl font-extrabold tracking-wide"
                style={{ color: profile.logo_color }}
              >
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt={profile.logo_text} className="max-h-10" />
                ) : (
                  profile.logo_text
                )}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-gray-600">
                <div className="font-semibold text-gray-800">{profile.company_name}</div>
                <div>{profile.address_line1}</div>
                <div>{profile.address_line2}</div>
                <div>{profile.phone}</div>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                This header prints on the PDF. The PO number and date are filled in automatically
                when you save.
              </p>
            </div>
          )}

          {/* This PO is addressed TO this vendor - who you're buying from. */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Vendor — who you're purchasing from
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Vendor</label>
                <SearchableSelect
                  options={suppliers.map((s) => ({ id: s.id, label: s.name }))}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Search vendors"
                />
              </div>
              <Field label="Customer no." value={form.customer_no} onChange={set('customer_no')} />
            </div>
            <div className="mt-4">
              <TextArea
                label="Vendor address"
                value={form.vendor_address}
                onChange={set('vendor_address')}
              />
            </div>
          </div>

          {/* Bill To / Ship To describe YOUR company - where the vendor
              should invoice and deliver. Prefilled from the department
              letterhead, editable (e.g. ship to a different site). */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea
              label="Bill to (your company)"
              value={form.bill_to}
              onChange={set('bill_to')}
            />
            <TextArea
              label="Ship to (delivery address)"
              value={form.ship_to}
              onChange={set('ship_to')}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Shipping method" value={form.shipping_method} onChange={set('shipping_method')} />
            <Field label="Shipping terms" value={form.shipping_terms} onChange={set('shipping_terms')} />
            <Field label="Ship via" value={form.ship_via} onChange={set('ship_via')} />
            <Field label="Payment" value={form.payment_terms} onChange={set('payment_terms')} />
            <Field
              label="Delivery date"
              type="date"
              value={form.delivery_date}
              onChange={set('delivery_date')}
            />
          </div>

          {/* ---- Items ---- */}
          <div className="rounded-xl border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Add item {departmentId ? '' : '(pick a department first)'}
              </label>
              <SearchableSelect
                options={itemOptions}
                value={pickItemId}
                onChange={(id) => id && addLine(id)}
                placeholder={
                  departmentId ? 'Search items in this department' : 'Pick a department first'
                }
              />
            </div>

            {lines.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No items yet. Search above to add the first one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-[11px] uppercase text-gray-500">
                      <th className="px-3 py-2">Item no.</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 w-20">Qty</th>
                      <th className="px-3 py-2 w-28">Unit price</th>
                      <th className="px-3 py-2 w-28 text-right">Total</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.key} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <input
                            value={l.item_no}
                            onChange={(e) => updateLine(l.key, 'item_no', e.target.value)}
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={l.description}
                            onChange={(e) => updateLine(l.key, 'description', e.target.value)}
                            className="w-full min-w-[160px] rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.qty}
                            onChange={(e) => updateLine(l.key, 'qty', e.target.value)}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.unit_price}
                            onChange={(e) => updateLine(l.key, 'unit_price', e.target.value)}
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatRs(num(l.qty) * num(l.unit_price))}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeLine(l.key)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea label="Remarks / instructions" value={form.remarks} onChange={set('remarks')} />

            <div className="space-y-2 rounded-xl border border-gray-200 p-4">
              <TotalRow label="Subtotal" value={formatRs(subtotal)} />
              <MoneyInput label="Discount" value={form.discount} onChange={set('discount')} />
              <TotalRow label="Subtotal less discount" value={formatRs(lessDiscount)} />
              <MoneyInput label="Tax rate (%)" value={form.tax_rate} onChange={set('tax_rate')} />
              <TotalRow label="Total tax" value={formatRs(totalTax)} />
              <MoneyInput
                label="Shipping / handling"
                value={form.shipping_handling}
                onChange={set('shipping_handling')}
              />
              <MoneyInput label="Other" value={form.other} onChange={set('other')} />
              <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm font-bold text-gray-900">
                <span>Total</span>
                <span>{formatRs(total)}</span>
              </div>
            </div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !departmentId || lines.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? 'Saving…' : 'Save & download PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}

function MoneyInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-600">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={onChange}
        className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm"
      />
    </div>
  )
}

function TotalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs text-gray-600">
      <span>{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}