import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { updateSupplierProduct } from '../api/endpoints'
import { formatRs } from '../utils/currency'
import { PricingModePicker, DimensionField, toInches } from './PricingFields'

/**
 * `cell` carries: supplier_product_id, total_price, total_length_or_quantity,
 * pricing_mode, length, length_unit, width, width_unit, productName, supplierName.
 */
export default function EditPriceModal({ cell, onClose, onSaved }) {
  const initialMode = cell?.pricing_mode || 'quantity'
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

  const handleSave = async (e) => {
    e.preventDefault()
    if (divisor <= 0) {
      setErr('Enter a valid quantity or both dimensions first.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await updateSupplierProduct(cell.supplier_product_id, {
        pricing_mode: pricingMode,
        total_price: Number(totalPrice),
        ...(isArea
          ? { length: Number(length), length_unit: lengthUnit, width: Number(width), width_unit: widthUnit }
          : { quantity: Number(quantity) }),
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Update Price</h2>
            <p className="text-xs text-gray-500">
              {cell.productName} - {cell.supplierName}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
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
              autoFocus
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

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save & Log History'}
          </button>
        </form>
      </div>
    </div>
  )
}
