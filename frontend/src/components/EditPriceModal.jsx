import { useState, useEffect, useMemo } from 'react'
import { X, Save, Tag, Layers, Building2, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  getDepartments,
  getCategories,
  getSuppliers,
  updateProduct,
  updateSupplierProduct,
  getVendorSiblings,
} from '../api/endpoints'
import { formatRs } from '../utils/currency'
import SearchableSelect from './SearchableSelect'
import QuickCreateVendorModal from './QuickCreateVendorModal'
import QuickCreateCategoryModal from './QuickCreateCategoryModal'
import { PricingModePicker, DimensionField, toInches } from './PricingFields'

/**
 * Full edit for one vendor's price entry AND the item it belongs to, in one
 * modal: item name, variant, department, category, vendor, pricing type,
 * price. Saving updates the Product row and the SupplierProduct row
 * together.
 *
 * `cell` carries: supplier_product_id, product_id, supplier_id, total_price,
 * total_length_or_quantity, pricing_mode, length, length_unit, width,
 * width_unit, productName, supplierName, variant_code_or_size,
 * department_id, category_id.
 */
export default function EditPriceModal({ cell, onClose, onSaved }) {
  const initialMode = cell?.pricing_mode || 'quantity'

  // --- Item fields ---
  const [name, setName] = useState(cell?.productName || '')
  const [variant, setVariant] = useState(cell?.variant_code_or_size || '')
  const [departmentId, setDepartmentId] = useState(cell?.department_id ? String(cell.department_id) : '')
  const [categoryId, setCategoryId] = useState(cell?.category_id ? String(cell.category_id) : '')

  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [quickCategorySeed, setQuickCategorySeed] = useState('')

  // --- Vendor + price fields ---
  const [vendors, setVendors] = useState([])
  const [loadingVendors, setLoadingVendors] = useState(true)
  const [vendorId, setVendorId] = useState(cell?.supplier_id ? String(cell.supplier_id) : '')
  const [showCreateVendor, setShowCreateVendor] = useState(false)
  const [quickVendorSeed, setQuickVendorSeed] = useState('')

  const [pricingMode, setPricingMode] = useState(initialMode)
  const [totalPrice, setTotalPrice] = useState(cell?.total_price ?? '')
  const [quantity, setQuantity] = useState(
    initialMode === 'quantity' ? cell?.total_length_or_quantity ?? '' : ''
  )
  const [length, setLength] = useState(cell?.length ?? '')
  const [lengthUnit, setLengthUnit] = useState(cell?.length_unit || 'in')
  const [width, setWidth] = useState(cell?.width ?? '')
  const [widthUnit, setWidthUnit] = useState(cell?.width_unit || 'in')
  const [changedBy, setChangedBy] = useState(localStorage.getItem('last_editor_name') || '')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  // --- Sibling-department follow-up prompts (after price save) ---
  const [siblingQueue, setSiblingQueue] = useState([])
  const [siblingPayload, setSiblingPayload] = useState(null)
  const [processingSibling, setProcessingSibling] = useState(false)
  const [siblingErrors, setSiblingErrors] = useState([])
  const [siblingFlowDone, setSiblingFlowDone] = useState(false)

  useEffect(() => {
    getDepartments().then(({ data }) => setDepartments(data))
    getCategories().then(({ data }) => setCategories(data))
    getSuppliers().then(({ data }) => setVendors(data)).finally(() => setLoadingVendors(false))
  }, [])

  const categoryOptions = useMemo(() => categories.map((c) => ({ id: c.id, label: c.name })), [categories])
  const vendorOptions = useMemo(() => vendors.map((v) => ({ id: v.id, label: v.name })), [vendors])

  if (!cell) return null

  const isArea = pricingMode === 'sq_inch' || pricingMode === 'sq_feet'
  const areaLabel = pricingMode === 'sq_inch' ? 'sq in' : 'sq ft'
  const areaSqIn = isArea && length && width ? toInches(length, lengthUnit) * toInches(width, widthUnit) : 0
  const divisor = isArea ? (pricingMode === 'sq_feet' ? areaSqIn / 144 : areaSqIn) : Number(quantity) || 0
  const unitPricePreview = totalPrice && divisor > 0 ? (Number(totalPrice) / divisor).toFixed(4) : '-'

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

  const handleCategoryCreated = (category) => {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
    setCategoryId(String(category.id))
    setShowCreateCategory(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErr('Item name is required.')
      return
    }
    if (!departmentId) {
      setErr('Select a department.')
      return
    }
    if (!categoryId) {
      setErr('Select or create a category.')
      return
    }
    if (!vendorId) {
      setErr('Select or create a vendor.')
      return
    }
    if (divisor <= 0) {
      setErr('Enter a valid quantity or both dimensions first.')
      return
    }

    setSaving(true)
    setErr(null)

    // 1. Save the item's own fields (name, variant, department, category)
    try {
      await updateProduct(cell.product_id, {
        name: name.trim(),
        variant_code_or_size: variant.trim() || null,
        department_id: Number(departmentId),
        category_id: Number(categoryId),
      })
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to update item details.')
      setSaving(false)
      return
    }

    // 2. Save the vendor + price fields
    const pricePayload = {
      supplier_id: Number(vendorId),
      pricing_mode: pricingMode,
      total_price: Number(totalPrice),
      ...(isArea
        ? { length: Number(length), length_unit: lengthUnit, width: Number(width), width_unit: widthUnit }
        : { quantity: Number(quantity) }),
      changed_by: changedBy || undefined,
    }

    try {
      await updateSupplierProduct(cell.supplier_product_id, pricePayload)
      if (changedBy) localStorage.setItem('last_editor_name', changedBy)
    } catch (error) {
      setErr(error.response?.data?.detail || 'Item details saved, but the price update failed.')
      setSaving(false)
      return
    }

    // 3. Same item under other departments, already priced by this same
    // vendor? Offer to apply the same new price there too.
    try {
      const { data: siblings } = await getVendorSiblings(cell.product_id, Number(vendorId))
      if (siblings.length > 0) {
        setSiblingPayload(pricePayload)
        setSiblingQueue(siblings)
        setSaving(false)
        return
      }
    } catch {
      // Non-fatal - the main save already succeeded, just skip the follow-up.
    }

    setSaving(false)
    onSaved()
  }

  const currentSibling = siblingQueue[0] || null

  const finishSiblingFlow = (errors) => {
    if (errors.length === 0) {
      onSaved()
    } else {
      setSiblingFlowDone(true)
    }
  }

  const handleSiblingYes = async () => {
    if (!currentSibling || !siblingPayload) return
    setProcessingSibling(true)
    let nextErrors = siblingErrors
    try {
      await updateSupplierProduct(currentSibling.supplier_product_id, siblingPayload)
    } catch (error) {
      nextErrors = [
        ...siblingErrors,
        {
          department_name: currentSibling.department_name,
          message: error.response?.data?.detail || 'Failed to update price.',
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

  // --- Sibling follow-up screen ---
  if (currentSibling || siblingFlowDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
        <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
          {siblingFlowDone ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Some prices didn't save</h2>
                <button onClick={onSaved} className="rounded-full p-1 hover:bg-gray-100">
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
                onClick={onSaved}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <h2 className="text-sm font-semibold text-gray-900">Price updated</h2>
              </div>
              <p className="mb-5 text-sm text-gray-600">
                <span className="font-medium">{name}</span> also has a price from this vendor in{' '}
                <span className="font-medium">{currentSibling.department_name}</span>. Update it to the
                same price there too?
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
                  {processingSibling ? 'Updating...' : 'Yes, update it'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // --- Main form ---
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Item & Price</h2>
            <p className="text-xs text-gray-500">{cell.productName} - {cell.supplierName}</p>
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

        <form onSubmit={handleSave} className="space-y-5">
          {/* --- Item details --- */}
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Item Details</p>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Item Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              <label className="mb-1 block text-xs font-medium text-gray-600">Department</label>
              <div className="relative">
                <Layers size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="" disabled>Select department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                <span>Category</span>
                <button
                  type="button"
                  onClick={() => { setQuickCategorySeed(''); setShowCreateCategory(true) }}
                  className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
                >
                  <PlusCircle size={13} /> Create category
                </button>
              </label>
              <SearchableSelect
                options={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="search categories..."
                icon={<Tag size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                onCreateNew={(typed) => { setQuickCategorySeed(typed); setShowCreateCategory(true) }}
                createLabel="+ Create category"
              />
            </div>
          </div>

          {/* --- Vendor + price --- */}
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vendor & Price</p>

            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                <span>Vendor</span>
                <button
                  type="button"
                  onClick={() => { setQuickVendorSeed(''); setShowCreateVendor(true) }}
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
                onCreateNew={(typed) => { setQuickVendorSeed(typed); setShowCreateVendor(true) }}
                createLabel="+ Create vendor"
              />
            </div>

            <PricingModePicker value={pricingMode} onChange={handleModeChange} />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Total Price (Rs.)</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <DimensionField label="Length" value={length} onValueChange={setLength} unit={lengthUnit} onUnitChange={setLengthUnit} />
                <DimensionField label="Width" value={width} onValueChange={setWidth} unit={widthUnit} onUnitChange={setWidthUnit} />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Your name <span className="font-normal text-gray-400">(optional, shown in history)</span>
              </label>
              <input
                value={changedBy}
                onChange={(e) => setChangedBy(e.target.value)}
                placeholder="e.g. Jane"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
              {isArea && divisor > 0 && (
                <div className="mb-1 text-xs text-brand-600">Area: {divisor.toFixed(2)} {areaLabel}</div>
              )}
              Calculated unit price: <span className="font-semibold">{formatRs(unitPricePreview, 4)}</span>
              <span className="ml-1 text-xs font-normal text-brand-500">/ {isArea ? areaLabel : 'unit'}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="sticky bottom-0 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
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

      {showCreateCategory && (
        <QuickCreateCategoryModal
          initialName={quickCategorySeed}
          onClose={() => setShowCreateCategory(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  )
}