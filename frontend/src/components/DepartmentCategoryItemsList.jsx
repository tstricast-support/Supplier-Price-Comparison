import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronDown, Package, Pencil, History } from 'lucide-react'
import { formatRs, unitSuffix } from '../utils/currency'

/**
 * Browse flow, flattened to match the Items tab: one row per item+vendor
 * offer (item name, variant if any, vendor name, unit price), collapsed by
 * default - tap a row to reveal Price Edit / History. Items with no vendor
 * price yet still show one row with an "Add vendor price" action instead
 * of a price.
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
  const [expandedKey, setExpandedKey] = useState(null)

  // Flatten items -> one row per vendor offer. Items with zero vendors
  // still get a single placeholder row so "Add vendor" stays reachable.
  const rows = useMemo(() => {
    const out = []
    items.forEach((item) => {
      if (item.vendors.length === 0) {
        out.push({
          key: `item-${item.product_id}`,
          item,
          vendor: null,
        })
      } else {
        item.vendors.forEach((v) => {
          out.push({
            key: `sp-${v.supplier_product_id}`,
            item,
            vendor: v,
          })
        })
      }
    })
    return out
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.item.product_name.toLowerCase().includes(q) ||
        (r.item.variant_code_or_size || '').toLowerCase().includes(q) ||
        (r.vendor?.supplier_name || '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const toggleExpanded = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key))
  }

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
        <ul className="space-y-2.5">
          {filtered.map((row) => {
            const isOpen = expandedKey === row.key
            const { item, vendor } = row

            return (
              <li key={row.key} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  onClick={() => vendor && toggleExpanded(row.key)}
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
                      <p className="truncate text-xs text-gray-500">
                        {vendor ? vendor.supplier_name : 'No vendor prices yet'}
                      </p>
                    </div>
                  </div>

                  {vendor ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatRs(vendor.unit_price, 2)}</p>
                        <p className="text-xs text-gray-500">/ {unitSuffix(vendor.pricing_mode)}</p>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddVendor(item)
                      }}
                      className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      Add vendor
                    </button>
                  )}
                </button>

                {isOpen && vendor && (
                  <div className="flex gap-2 border-t border-gray-100 p-4 pt-3">
                    <button
                      onClick={() => onEditVendor(item, vendor)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      <Pencil size={13} /> Price Edit
                    </button>
                    <button
                      onClick={() => onHistoryVendor(item, vendor)}
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