import { useState, useMemo } from 'react'
import { Search, ChevronRight, ChevronLeft, Package, Pencil, Layers } from 'lucide-react'
import { formatRs } from '../utils/currency'

/** Step 2 of the Items tab: A-Z items within the chosen category, across departments. */
export default function CategoryItemList({ category, items, loading, onBack, onSelect, onEdit }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.product_name.toLowerCase().includes(q) ||
        (it.variant_code_or_size || '').toLowerCase().includes(q) ||
        (it.department_name || '').toLowerCase().includes(q)
    )
  }, [items, search])

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          <ChevronLeft size={16} /> Categories
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">{category.name}</span>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items in this category..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading items...</p>}
      {!loading && filtered.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No items found.</p>}

      {!loading && filtered.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {filtered.map((item) => (
            <li key={item.product_id} className="flex items-center">
              <button
                onClick={() => onSelect(item)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-gray-100 p-2">
                    <Package size={16} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{item.product_name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {item.variant_code_or_size || 'No variant'} · {item.vendor_count} vendor{item.vendor_count === 1 ? '' : 's'}
                    </p>
                    {item.department_name && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        <Layers size={10} /> {item.department_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.cheapest_unit_price != null && (
                    <span className="text-sm font-semibold text-green-700">from {formatRs(item.cheapest_unit_price, 2)}</span>
                  )}
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(item) }}
                aria-label={`Edit ${item.product_name}`}
                className="mr-3 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
              >
                <Pencil size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}