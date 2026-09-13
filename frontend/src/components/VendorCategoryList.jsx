import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronDown, Tag, Printer, Pencil, History, Package, Layers } from 'lucide-react'
import { getSupplierCategoryItems } from '../api/endpoints'
import { formatRs, formatMeasurement, unitSuffix } from '../utils/currency'

/**
 * Step 2 of Vendor View, accordion style: categories this vendor has items
 * in, A-Z. Clicking a category expands it inline (roll down) to show its
 * items right there on the same page - no separate "items" screen. Items
 * are fetched lazily the first time a category is opened, then cached.
 */
export default function VendorCategoryList({
  supplier,
  categories,
  loading,
  onBack,
  onPrintAll,
  printingAll,
  onEditVendor,
  onHistoryVendor,
}) {
  const [expandedCategoryId, setExpandedCategoryId] = useState(null)
  const [itemsByCategory, setItemsByCategory] = useState({}) // category_id -> items[]
  const [loadingCategoryId, setLoadingCategoryId] = useState(null)
  const [expandedItemKey, setExpandedItemKey] = useState(null) // supplier_product_id currently showing Edit/History
  const [errorByCategory, setErrorByCategory] = useState({})

  const fetchCategoryItems = (catId) => {
    setLoadingCategoryId(catId)
    setErrorByCategory((prev) => ({ ...prev, [catId]: null }))
    getSupplierCategoryItems(supplier.id, catId)
      .then(({ data }) => {
        setItemsByCategory((prev) => ({ ...prev, [catId]: data.items }))
      })
      .catch((error) => {
        console.error('Failed to load category items:', error)
        setErrorByCategory((prev) => ({
          ...prev,
          [catId]: error.response?.data?.detail || 'Failed to load items for this category.',
        }))
      })
      .finally(() => setLoadingCategoryId(null))
  }

  const toggleCategory = (category) => {
    const catId = category.category_id
    if (expandedCategoryId === catId) {
      setExpandedCategoryId(null)
      return
    }
    setExpandedCategoryId(catId)
    setExpandedItemKey(null)
    if (!itemsByCategory[catId]) {
      fetchCategoryItems(catId)
    }
  }

  const refreshCategory = (categoryId) => {
    fetchCategoryItems(categoryId)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            <ChevronLeft size={16} /> Vendors
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-900">{supplier.name}</span>
        </div>
        <button
          onClick={onPrintAll}
          disabled={printingAll}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Printer size={14} /> {printingAll ? 'Preparing...' : 'Print Item List'}
        </button>
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading categories...</p>}
      {!loading && categories.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">This vendor has no priced items yet.</p>
      )}

      {!loading && categories.length > 0 && (
        <ul className="space-y-2.5">
          {categories.map((c) => {
            const isOpen = expandedCategoryId === c.category_id
            const items = itemsByCategory[c.category_id] || []
            const isLoadingItems = loadingCategoryId === c.category_id

            return (
              <li key={c.category_id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  onClick={() => toggleCategory(c)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                      <Tag size={16} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{c.category_name}</p>
                      <p className="text-xs text-gray-500">{c.item_count} item{c.item_count === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-3">
                    {isLoadingItems && (
                      <p className="py-6 text-center text-sm text-gray-500">Loading items...</p>
                    )}

                    {!isLoadingItems && errorByCategory[c.category_id] && (
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <p className="text-sm text-red-600">{errorByCategory[c.category_id]}</p>
                        <button
                          onClick={() => fetchCategoryItems(c.category_id)}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {!isLoadingItems && !errorByCategory[c.category_id] && items.length === 0 && (
                      <p className="py-6 text-center text-sm text-gray-500">No items in this category.</p>
                    )}

                    {!isLoadingItems && items.length > 0 && (
                      <ul className="space-y-2">
                        {items.map((item) => {
                          const itemIsOpen = expandedItemKey === item.supplier_product_id
                          return (
                            <li key={item.supplier_product_id} className="rounded-lg border border-gray-100 bg-gray-50">
                              <button
                                onClick={() =>
                                  setExpandedItemKey((prev) =>
                                    prev === item.supplier_product_id ? null : item.supplier_product_id
                                  )
                                }
                                className="flex w-full items-start justify-between gap-3 p-3 text-left"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="shrink-0 rounded-lg bg-white p-1.5 ring-1 ring-gray-200">
                                    <Package size={14} className="text-gray-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="truncate text-sm font-semibold text-gray-900">{item.product_name}</p>
                                      {item.variant_code_or_size && (
                                        <span className="shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                          {item.variant_code_or_size}
                                        </span>
                                      )}
                                    </div>
                                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                      <Layers size={9} /> {item.department_name}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-bold text-gray-900">{formatRs(item.unit_price, 2)}</p>
                                  <p className="text-[10px] text-gray-500">/ {unitSuffix(item.pricing_mode)}</p>
                                </div>
                              </button>

                              {itemIsOpen && (
                                <div className="border-t border-gray-200 p-3 pt-2.5">
                                  <p className="mb-2 text-xs text-gray-500">
                                    Total {formatRs(item.total_price)} for {formatMeasurement(item)}
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        onEditVendor(item, () => refreshCategory(c.category_id))
                                      }
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                                    >
                                      <Pencil size={13} /> Price Edit
                                    </button>
                                    <button
                                      onClick={() => onHistoryVendor(item)}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
                                    >
                                      <History size={13} /> History
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
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