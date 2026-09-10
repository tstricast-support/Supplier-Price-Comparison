import { ChevronLeft, Trophy, Building2, Pencil, History } from 'lucide-react'
import { formatRs, formatMeasurement, unitSuffix } from '../utils/currency'

/** Step 3 of Browse: A-Z vendors offering the chosen item, each with
 * Price Edit / History actions. */
export default function VendorList({ item, department, vendors, loading, onBack, onEdit, onHistory }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft size={16} /> {department.name}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">{item.name}</span>
      </div>

      {item.variant_code_or_size && (
        <p className="mb-4 text-xs text-gray-500">Variant: {item.variant_code_or_size}</p>
      )}

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading vendors...</p>}

      {!loading && vendors.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">
          No vendor prices yet for this item. Add one from "+ New Product" in the nav bar.
        </p>
      )}

      {!loading && vendors.length > 0 && (
        <ul className="space-y-2.5">
          {vendors.map((v) => (
            <li
              key={v.supplier_product_id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                v.is_cheapest ? 'border-green-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={`shrink-0 rounded-lg p-2 ${v.is_cheapest ? 'bg-green-50' : 'bg-gray-100'}`}>
                    <Building2 size={16} className={v.is_cheapest ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold text-gray-900">{v.supplier_name}</p>
                      {v.is_cheapest && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          <Trophy size={10} /> CHEAPEST
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Total {formatRs(v.total_price)} for {formatMeasurement(v)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-gray-900">{formatRs(v.unit_price, 2)}</p>
                  <p className="text-xs text-gray-500">/ {unitSuffix(v.pricing_mode)}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onEdit(v)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <Pencil size={13} /> Price Edit
                </button>
                <button
                  onClick={() => onHistory(v)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                >
                  <History size={13} /> History
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
