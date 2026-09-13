import { useState, useEffect, useMemo } from 'react'
import { X, PlusCircle, Building2, AlertCircle, Layers } from 'lucide-react'
import { getSuppliers, createSubitem } from '../api/endpoints'
import SearchableSelect from './SearchableSelect'
import QuickCreateVendorModal from './QuickCreateVendorModal'
import { PricingModePicker, DimensionField, toInches } from './PricingFields'
import { formatRs } from '../utils/currency'

/**
 * Creates an item "inside" another item (a subitem): its own name, its own
 * pricing type + total price, and a vendor.
 *
 * `parent` = { id, name } - the item this subitem will live under.
 * `supplier` = { id, name } - optional. When given (e.g. triggered from an
 * already vendor-scoped context, like the price-edit form or a vendor row),
 * the vendor is shown read-only and the picker is skipped. When omitted
 * (e.g. a plain long-press on an item with no vendor context yet), a
 * searchable vendor picker is shown instead.
 */
export default function SubitemCreateModal({ parent, supplier, onClose, onCreated }) {
  const [name, setName] = useState('')

  const [vendors, setVendors] = useState(supplier ? [supplier] : [])
  const [loadingVendors, setLoadingVendors] = useState(!supplier)
  const [vendorId, setVendorId] = useState(supplier ? String(supplier.id) : '')
  const [showCreateVendor, setShowCreateVendor] = useState(false)

  const [pricingMode, setPricingMode] = useState('quantity')
  const [totalPrice, setTotalPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [length, setLength] = useState('')
  const [lengthUnit, setLengthUnit] = useState('in')
  const [width, setWidth] = useState('')
  const [widthUnit, setWidthUnit] = useState('in')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (supplier) return // vendor is already fixed by context
    getSuppliers()
      .then(({ data }) => setVendors(data))
      .finally(() => setLoadingVendors(false))
  }, [supplier])

  const vendorOptions = useMemo(() => vendors.map((v) => ({ id: v.id, label: v.name })), [vendors])

  const isArea = pricingMode === 'sq_inch' || pricingMode === 'sq_feet'
  const areaLabel = pricingMode === 'sq_inch' ? 'sq in' : 'sq ft'
  const areaSqIn = isArea && length && width ? toInches(length, lengthUnit) * toInches(width, widthUnit) : 0
  const divisor = isArea ? (pricingMode === 'sq_feet' ? areaSqIn / 144 : areaSqIn) : Number(quantity) || 0
  const unitPricePreview = totalPrice && divisor > 0 ? (Number(totalPrice) / divisor).toFixed(2) : null

  const handleModeChange = (mode) => {
    setPricingMode(mode)
    setQuantity('')
    setLength('')
    setWidth('')
  }

  const handleVendorCreated = (vendor) => {
    setVendors((prev) => [...prev, vendor].sort((a, b) => a.name.localeCompare(b.name)))
    setVendorId(String(vendor.id))
    setShowCreateVendor(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErr('Subitem name is required.')
      return
    }
    if (!vendorId) {
      setErr('Select or create a vendor.')
      return
    }
    if (!totalPrice) {
      setErr('Enter the total price.')
      return
    }
    if (divisor <= 0) {
      setErr('Enter a valid quantity, or both length and width.')
      return
    }

    setSaving(true)
    setErr(null)
    try {
      const { data } = await createSubitem(parent.id, {
        name: name.trim(),
        supplier_id: Number(vendorId),
        pricing_mode: pricingMode,
        total_price: Number(totalPrice),
        ...(isArea
          ? { length: Number(length), length_unit: lengthUnit, width: Number(width), width_unit: widthUnit }
          : { quantity: Number(quantity) }),
      })
      setSaving(false)
      onCreated(data)
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to create subitem.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create Subitem</h2>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <Layers size={12} /> Inside <span className="font-medium">{parent.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} />
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Subitem Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              placeholder="e.g. Matte finish"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {supplier ? (
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
              <Building2 size={14} className="shrink-0 text-gray-400" />
              Vendor: <span className="font-medium text-gray-900">{supplier.name}</span>
            </div>
          ) : (
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                <span>Vendor</span>
                <button
                  type="button"
                  onClick={() => setShowCreateVendor(true)}
                  className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
                >
                  <PlusCircle size={13} /> Create vendor
                </button>
              </label>
              <SearchableSelect
                options={vendorOptions}
                value={vendorId}
                onChange={setVendorId}
                placeholder={loadingVendors ? 'Loading vendors...' : 'search vendors...'}
                icon={<Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                onCreateNew={() => setShowCreateVendor(true)}
                createLabel="+ Create vendor"
              />
            </div>
          )}

          <PricingModePicker value={pricingMode} onChange={handleModeChange} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Total Price (Rs.)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {pricingMode === 'quantity' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Total Length / Quantity</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <DimensionField label="Length" value={length} onValueChange={setLength} unit={lengthUnit} onUnitChange={setLengthUnit} />
              <DimensionField label="Width" value={width} onValueChange={setWidth} unit={widthUnit} onUnitChange={setWidthUnit} />
            </div>
          )}

          <div className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
            {isArea && divisor > 0 && (
              <div className="mb-1 text-xs text-brand-600">Area: {divisor.toFixed(2)} {areaLabel}</div>
            )}
            Calculated unit price:{' '}
            <span className="font-semibold">{unitPricePreview ? formatRs(unitPricePreview, 2) : '-'}</span>
            <span className="ml-1 text-xs font-normal text-brand-500">/ {isArea ? areaLabel : 'unit'}</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create Subitem'}
          </button>
        </form>
      </div>

      {showCreateVendor && (
        <QuickCreateVendorModal
          initialName=""
          onClose={() => setShowCreateVendor(false)}
          onCreated={handleVendorCreated}
        />
      )}
    </div>
  )
}
