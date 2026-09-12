import { useState, useMemo } from 'react'
import { Search, ChevronLeft, Package, Pencil, History, PlusCircle } from 'lucide-react'
import { formatRs, formatMeasurement, unitSuffix } from '../utils/currency'

/**
 * Browse flow, single screen: items in this department+category, each
 * showing its own vendor offers inline (name, unit price, Edit/History),
 * plus a per-item "+ Add Vendor" action. Replaces the old separate
 * "pick item -> pick vendor" sub-screen.
 */
export default function DepartmentCategoryItemsList({
  department,
  category,
  items,
  loading,
  onBack,
  onAddVendor,
  onEditVendor,
  onHistoryVendor,
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.product_name.toLowerCase().includes(q) ||
        (it.variant_code_or_size || '').toLowerCase().includes(q) ||
        it.vendors.some((v) => v.supplier_name.toLowerCase().includes(q))
    )
  }, [items, search])

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          <ChevronLeft size={16} /> {department.name}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">{category.category_name || category.name}</span>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items or vendors..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading items...</p>}
      {!loading && filtered.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No items in this category yet.</p>}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.product_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="shrink-0 rounded-lg bg-gray-100 p-2">
                    <Package size={16} className="text-gray-500" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-semibold text-gray-900">{item.product_name}</p>
                    {item.variant_code_or_size && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {item.variant_code_or_size}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onAddVendor(item)}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <PlusCircle size={13} /> Add Vendor
                </button>
              </div>

              {item.vendors.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
                  No vendor prices yet. Tap "Add Vendor" to add one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {item.vendors.map((v) => (
                    <li
                      key={v.supplier_product_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{v.supplier_name}</p>
                        <p className="truncate text-xs text-gray-500">
                          Total {formatRs(v.total_price)} for {formatMeasurement(v)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {formatRs(v.unit_price, 2)}
                          <span className="ml-1 text-xs font-normal text-gray-500">/ {unitSuffix(v.pricing_mode)}</span>
                        </span>
                        <button
                          onClick={() => onEditVendor(item, v)}
                          aria-label={`Edit ${v.supplier_name} price`}
                          className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onHistoryVendor(item, v)}
                          aria-label={`History for ${v.supplier_name}`}
                          className="rounded-lg bg-white p-1.5 text-gray-600 ring-1 ring-gray-300 hover:bg-gray-100"
                        >
                          <History size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}