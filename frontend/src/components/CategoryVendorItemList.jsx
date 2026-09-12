import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ChevronLeft, ChevronDown, Package, Pencil, History } from 'lucide-react'
import { formatRs, unitSuffix } from '../utils/currency'

/** Items tab, single screen: every vendor offer for every item in this
 * category. Each row is collapsed by default - tap it to reveal Price Edit
 * / History. If `highlightProductId` is set (e.g. from the global search
 * bar), the matching row auto-expands and scrolls into view. */
export default function CategoryVendorItemList({ category, items, loading, onBack, onEdit, onHistory, highlightProductId }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const rowRefs = useRef({})

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.product_name.toLowerCase().includes(q) ||
        (it.variant_code_or_size || '').toLowerCase().includes(q) ||
        it.supplier_name.toLowerCase().includes(q) ||
        (it.department_name || '').toLowerCase().includes(q)
    )
  }, [items, search])

  useEffect(() => {
    if (!highlightProductId || items.length === 0) return
    const match = items.find((it) => it.product_id === highlightProductId)
    if (match) {
      setExpandedId(match.supplier_product_id)
      setTimeout(() => {
        rowRefs.current[match.supplier_product_id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [highlightProductId, items])

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

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
          placeholder="Filter items or vendors in this category..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading items...</p>}
      {!loading && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">No priced items in this category yet.</p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-2.5">
          {filtered.map((item) => {
            const isOpen = expandedId === item.supplier_product_id
            const isHighlighted = highlightProductId === item.product_id
            return (
              <li
                key={item.supplier_product_id}
                ref={(el) => { rowRefs.current[item.supplier_product_id] = el }}
                className={`rounded-xl border bg-white shadow-sm ${isHighlighted ? 'border-brand-400 ring-2 ring-brand-100' : 'border-gray-200'}`}
              >
                <button
                  onClick={() => toggleExpanded(item.supplier_product_id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 rounded-lg bg-gray-100 p-2">
                      <Package size={16} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold text-gray-900">{item.product_name}</p>
                        {item.variant_code_or_size && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            {item.variant_code_or_size}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">{item.supplier_name}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatRs(item.unit_price, 2)}</p>
                      <p className="text-xs text-gray-500">/ {unitSuffix(item.pricing_mode)}</p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="flex gap-2 border-t border-gray-100 p-4 pt-3">
                    <button
                      onClick={() => onEdit(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      <Pencil size={13} /> Price Edit
                    </button>
                    <button
                      onClick={() => onHistory(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                    >
                      <History size={13} /> History
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}