import { useState, useEffect, useMemo } from 'react'
import { X, PlusCircle, Building2, CheckCircle2, AlertCircle } from 'lucide-react'
import { getDepartments, getSuppliers, createProduct, createSupplierProduct } from '../api/endpoints'
import SearchableSelect from './SearchableSelect'
import QuickCreateVendorModal from './QuickCreateVendorModal'
import { PricingModePicker, DimensionField, toInches } from './PricingFields'

/**
 * "+ New Product" flow, reachable from the nav bar on every screen.
 * Fields: item name, variant/size (optional), department(s) [checkboxes],
 * vendor [searchable select w/ inline "create vendor"], pricing type,
 * total price. Saving creates the product in every selected department and
 * one price entry per department, all against the chosen vendor.
 */
export default function CreateProductModal({ onClose, onCreated }) {
  const [departments, setDepartments] = useState([])
  const [vendors, setVendors] = useState([])

  const [itemName, setItemName] = useState('')
  const [variant, setVariant] = useState('')
  const [departmentIds, setDepartmentIds] = useState([])
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
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    getDepartments().then(({ data }) => setDepartments(data))
    getSuppliers().then(({ data }) => setVendors(data))
  }, [])

  const vendorOptions = useMemo(
    () => vendors.map((v) => ({ id: v.id, label: v.name })),
    [vendors]
  )

  const toggleDepartment = (id) => {
    setDepartmentIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  const isArea = pricingMode === 'sq_inch' || pricingMode === 'sq_feet'
  const areaLabel = pricingMode === 'sq_inch' ? 'sq in' : 'sq ft'
  const areaSqIn = isArea && length && width ? toInches(length, lengthUnit) * toInches(width, widthUnit) : 0
  const divisor = isArea ? (pricingMode === 'sq_feet' ? areaSqIn / 144 : areaSqIn) : Number(quantity) || 0
  const unitPreview = totalPrice && divisor > 0 ? (Number(totalPrice) / divisor).toFixed(4) : '-'

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
    if (departmentIds.length === 0) {
      setNotice({ type: 'error', message: 'Select at least one department.' })
      return
    }
    if (!vendorId) {
      setNotice({ type: 'error', message: 'Select or create a vendor.' })
      return
    }
    if (divisor <= 0) {
      setNotice({ type: 'error', message: 'Enter a valid quantity or both dimensions.' })
      return
    }

    setSaving(true)
    setNotice(null)

    try {
      // 1. Create the product in each selected department
      const productResults = await Promise.allSettled(
        departmentIds.map((deptId) =>
          createProduct({
            name: itemName.trim(),
            variant_code_or_size: variant.trim() || null,
            department_id: Number(deptId),
          })
        )
      )

      const createdProducts = productResults
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value.data)
      const failedCount = productResults.length - createdProducts.length

      if (createdProducts.length === 0) {
        setNotice({
          type: 'error',
          message: productResults[0].reason?.response?.data?.detail || 'Failed to create item.',
        })
        setSaving(false)
        return
      }

      // 2. Attach a price entry (this vendor) to each created product
      const pricePayload = {
        supplier_id: Number(vendorId),
        total_price: Number(totalPrice),
        pricing_mode: pricingMode,
        ...(isArea
          ? { length: Number(length), length_unit: lengthUnit, width: Number(width), width_unit: widthUnit }
          : { quantity: Number(quantity) }),
      }

      const priceResults = await Promise.allSettled(
        createdProducts.map((p) => createSupplierProduct({ ...pricePayload, product_id: p.id }))
      )
      const priceFailed = priceResults.filter((r) => r.status === 'rejected').length

      if (failedCount === 0 && priceFailed === 0) {
        setNotice({
          type: 'success',
          message: `"${itemName.trim()}" created in ${createdProducts.length} department(s) with a price from this vendor.`,
        })
        setTimeout(() => {
          onCreated()
        }, 700)
      } else {
        setNotice({
          type: 'error',
          message: `Created, but ${failedCount + priceFailed} step(s) failed (item may already exist in that department).`,
        })
        onCreated()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Product</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {notice && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {notice.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {notice.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Item Name</label>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Canvas Roll 4702"
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

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Departments</label>
            <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-gray-300 p-2 sm:grid-cols-2">
              {departments.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-gray-50"
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
                <p className="px-1.5 py-1 text-xs text-gray-400">Loading departments...</p>
              )}
            </div>
          </div>

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
                <PlusCircle size={13} /> CREATE NEW VENDOR
              </button>
            </label>
            <SearchableSelect
              options={vendorOptions}
              value={vendorId}
              onChange={setVendorId}
              placeholder="search vendors..."
              icon={<Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
              onCreateNew={(typed) => {
                setQuickVendorSeed(typed)
                setShowCreateVendor(true)
              }}
              createLabel="CREATE NEW VENDOR"
            />
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
            {saving ? 'Saving...' : 'Save Product'}
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
