import { useState, useEffect, useMemo } from 'react'
import { X, PlusCircle, Building2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getSuppliers, createSupplierProduct, getProductSiblings } from '../api/endpoints'
import SearchableSelect from './SearchableSelect'
import QuickCreateVendorModal from './QuickCreateVendorModal'
import ConfirmDialog from './ConfirmDialog'
import { PricingModePicker, DimensionField, toInches } from './PricingFields'

/**
 * Adds a new vendor price to an EXISTING product (unlike CreateProductModal,
 * which creates the product itself). Reachable from VendorList's
 * "+ Add Vendor" button so an item can carry prices from more than one
 * supplier.
 *
 * `item` = { id, name, variant_code_or_size }
 * `existingVendorIds` = supplier ids this item already has a price from,
 * so they're filtered out of the picker (edit that price instead).
 *
 * After saving, if this same item (same name + variant) also exists under
 * other departments (created together via the multi-department "New
 * Product" form), asks - one department at a time - whether to add this
 * same vendor's price there too, instead of silently leaving those
 * departments without it.
 */
export default function AddVendorModal({ item, existingVendorIds = [], onClose, onCreated }) {
  const [vendors, setVendors] = useState([])
  const [loadingVendors, setLoadingVendors] = useState(true)

  const [vendorId, setVendorId] = useState('')
  const [showCreateVendor, setShowCreateVendor] = useState(false)
  const [quickVendorSeed, setQuickVendorSeed] = useState('')

  const [pricingMode, setPricingMode] = useState('quantity')
  const [totalPrice, setTotalPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [length, setLength] = useState('')
  const [lengthUnit, setLengthUnit] = useState('in')
  const [width, setWidth] = useState('')
  const [widthUnit, setWidthUnit] = useState('in')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  // --- Sibling-department follow-up prompts ---
  const [siblingQueue, setSiblingQueue] = useState([])
  const [siblingPayload, setSiblingPayload] = useState(null)
  const [siblingVendorName, setSiblingVendorName] = useState('')
  const [processingSibling, setProcessingSibling] = useState(false)
  const [siblingErrors, setSiblingErrors] = useState([])
  const [siblingFlowDone, setSiblingFlowDone] = useState(false)

  useEffect(() => {
    getSuppliers()
      .then(({ data }) => setVendors(data))
      .finally(() => setLoadingVendors(false))
  }, [])

  const vendorOptions = useMemo(
    () =>
      vendors
        .filter((v) => !existingVendorIds.includes(v.id))
        .map((v) => ({ id: v.id, label: v.name })),
    [vendors, existingVendorIds]
  )

  const isArea = pricingMode === 'sq_inch' || pricingMode === 'sq_feet'
  const areaLabel = pricingMode === 'sq_inch' ? 'sq in' : 'sq ft'
  const areaSqIn = isArea && length && width ? toInches(length, lengthUnit) * toInches(width, widthUnit) : 0
  const divisor = isArea ? (pricingMode === 'sq_feet' ? areaSqIn / 144 : areaSqIn) : Number(quantity) || 0
  const unitPreview = totalPrice && divisor > 0 ? (Number(totalPrice) / divisor).toFixed(4) : '—'

  const handleModeChange = (mode) => {
    setPricingMode(mode)
    setQuantity('')
    setLength('')
    setWidth('')
    const defaultUnit = mode === 'sq_feet' ? 'ft' : 'in'
    setLengthUnit(defaultUnit)
    setWidthUnit(defaultUnit)
  }

  const handleVendorCreated = (vendor) => {
    setVendors((prev) => [...prev, vendor].sort((a, b) => a.name.localeCompare(b.name)))
    setVendorId(String(vendor.id))
    setShowCreateVendor(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!vendorId) {
      setErr('Select or create a vendor.')
      return
    }
    if (divisor <= 0) {
      setErr('Enter a valid quantity or both dimensions.')
      return
    }

    setSaving(true)
    setErr(null)

    const pricePayload = {
      supplier_id: Number(vendorId),
      total_price: Number(totalPrice),
      pricing_mode: pricingMode,
      ...(isArea
        ? { length: Number(length), length_unit: lengthUnit, width: Number(width), width_unit: widthUnit }
        : { quantity: Number(quantity) }),
    }

    try {
      await createSupplierProduct({ ...pricePayload, product_id: item.id })
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to add vendor price.')
      setSaving(false)
      return
    }

    // Vendor price for THIS department's copy is saved. Now check whether
    // the same item exists under other departments and doesn't have this
    // vendor's price yet.
    try {
      const { data: siblings } = await getProductSiblings(item.id, Number(vendorId))
      if (siblings.length > 0) {
        const vendorName = vendors.find((v) => String(v.id) === String(vendorId))?.name || 'This vendor'
        setSiblingVendorName(vendorName)
        setSiblingPayload(pricePayload)
        setSiblingQueue(siblings)
        setSaving(false)
        return // keep the modal open to run the follow-up prompts
      }
    } catch {
      // Non-fatal - the main save already succeeded, just skip the follow-up.
    }

    setSaving(false)
    onCreated()
  }

  const currentSibling = siblingQueue[0] || null

  const finishSiblingFlow = (errors) => {
    if (errors.length === 0) {
      onCreated()
    } else {
      // Something failed along the way - let the user see what, instead of
      // silently closing as if everything went through.
      setSiblingFlowDone(true)
    }
  }

  const handleSiblingYes = async () => {
    if (!currentSibling || !siblingPayload) return
    setProcessingSibling(true)
    let nextErrors = siblingErrors
    try {
      await createSupplierProduct({ ...siblingPayload, product_id: currentSibling.id })
    } catch (error) {
      nextErrors = [
        ...siblingErrors,
        {
          department_name: currentSibling.department_name,
          message: error.response?.data?.detail || 'Failed to add vendor price.',
        },
      ]
      setSiblingErrors(nextErrors)
    }
    setProcessingSibling(false)
    const rest = siblingQueue.slice(1)
    setSiblingQueue(rest)
    if (rest.length === 0) finishSiblingFlow(nextErrors)
  }

  const handleSiblingNo = () => {
    const rest = siblingQueue.slice(1)
    setSiblingQueue(rest)
    if (rest.length === 0) finishSiblingFlow(siblingErrors)
  }

  // --- Sibling follow-up screen (shown after the main save succeeds) ---
  if (currentSibling || siblingFlowDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
        <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
          {siblingFlowDone ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Some prices didn't save</h2>
                <button onClick={onCreated} className="rounded-full p-1 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
              <ul className="mb-4 space-y-2">
                {siblingErrors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{e.department_name}:</span> {e.message}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onCreated}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <h2 className="text-sm font-semibold text-gray-900">Vendor price added</h2>
              </div>
              <p className="mb-5 text-sm text-gray-600">
                <span className="font-medium">{item.name}</span> also exists in{' '}
                <span className="font-medium">{currentSibling.department_name}</span>. Add{' '}
                <span className="font-medium">{siblingVendorName}</span>'s price there too?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSiblingNo}
                  disabled={processingSibling}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  No
                </button>
                <button
                  onClick={handleSiblingYes}
                  disabled={processingSibling}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {processingSibling ? 'Adding...' : 'Yes, add it'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // --- Main "Add Vendor" form ---
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Vendor</h2>
            <p className="text-xs text-gray-500">
              {item.name}
              {item.variant_code_or_size ? ` — ${item.variant_code_or_size}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={20} />
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
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
              <span>Vendor</span>
              <button
                type="button"
                onClick={() => {
                  setQuickVendorSeed('')
                  setShowCreateVendor(true)
                }}
                className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
              >
                <PlusCircle size={13} /> Create vendor
              </button>
            </label>
            <SearchableSelect
              options={vendorOptions}
              value={vendorId}
              onChange={setVendorId}
              placeholder={loadingVendors ? 'Loading vendors...' : 'Type to search vendors...'}
              icon={<Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
              onCreateNew={(typed) => {
                setQuickVendorSeed(typed)
                setShowCreateVendor(true)
              }}
              createLabel="+ Create vendor"
            />
            {!loadingVendors && vendorOptions.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Every vendor already has a price for this item. Create a new vendor to add another.
              </p>
            )}
          </div>

          <PricingModePicker value={pricingMode} onChange={handleModeChange} />

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Total Price (Rs.)</label>
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
              <label className="mb-1 block text-xs font-medium text-gray-600">Quantity</label>
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
              <div className="mb-1 text-xs text-brand-600">
                Area: {divisor.toFixed(2)} {areaLabel}
              </div>
            )}
            Unit price: <span className="font-semibold">Rs. {unitPreview}</span>
            <span className="ml-1 text-xs font-normal text-brand-500">/ {isArea ? areaLabel : 'unit'}</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="sticky bottom-0 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <PlusCircle size={16} />
            {saving ? 'Saving...' : 'Add Vendor Price'}
          </button>
        </form>
      </div>

      {showCreateVendor && (
        <QuickCreateVendorModal
          initialName={quickVendorSeed}
          onClose={() => setShowCreateVendor(false)}
          onCreated={handleVendorCreated}
        />
      )}
    </div>
  )
}