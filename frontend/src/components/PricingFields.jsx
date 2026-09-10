/**
 * Shared "pricing type" UI: Quantity vs sq-inch vs sq-feet, with length/width
 * + unit pickers for the area modes. Used by both CreateProductModal (new
 * price entry) and EditPriceModal (updating an existing one) so the two
 * forms always stay in sync.
 */
const PRICING_MODE_OPTIONS = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'sq_inch', label: 'Inches (L×W)' },
  { value: 'sq_feet', label: 'Feet (L×W)' },
]

const UNIT_OPTIONS = [
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
  { value: 'm', label: 'm' },
  { value: 'cm', label: 'cm' },
]

export const INCH_PER_UNIT = { in: 1, ft: 12, m: 39.3701, cm: 0.393701 }
export const toInches = (value, unit) => Number(value) * (INCH_PER_UNIT[unit] || 1)

export function PricingModePicker({ value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">Pricing Type</label>
      <div className="grid grid-cols-3 gap-2">
        {PRICING_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
              value === opt.value
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DimensionField({ label, value, onValueChange, unit, onUnitChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <div className="flex gap-1.5">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="w-16 shrink-0 rounded-lg border border-gray-300 px-1.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export { UNIT_OPTIONS }
