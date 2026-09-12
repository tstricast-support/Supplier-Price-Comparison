import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Tag, Building2, Package, Loader2 } from 'lucide-react'
import { globalSearch } from '../api/endpoints'

/**
 * Global search bar shown in the header on every page. Searches categories,
 * vendors, and items together; picking a result navigates straight to the
 * relevant screen instead of just filtering the current page.
 */
export default function GlobalSearchBar({ onSelectCategory, onSelectVendor, onSelectItem }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ categories: [], vendors: [], items: [] })
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const runSearch = useCallback((q) => {
    if (!q.trim()) {
      setResults({ categories: [], vendors: [], items: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    globalSearch(q.trim())
      .then(({ data }) => setResults(data))
      .catch(() => setResults({ categories: [], vendors: [], items: [] }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, runSearch])

  const hasResults =
    results.categories.length > 0 || results.vendors.length > 0 || results.items.length > 0

  const handleClear = () => {
    setQuery('')
    setResults({ categories: [], vendors: [], items: [] })
  }

  const pick = (fn, arg) => {
    fn(arg)
    setOpen(false)
    setQuery('')
    setResults({ categories: [], vendors: [], items: [] })
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search categories, items, vendors..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {query && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Searching...
            </div>
          )}

          {!loading && !hasResults && (
            <div className="px-3 py-3 text-sm text-gray-400">No matches for "{query}".</div>
          )}

          {!loading && results.categories.length > 0 && (
            <div>
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Categories
              </p>
              {results.categories.map((c) => (
                <button
                  key={`cat-${c.id}`}
                  onClick={() => pick(onSelectCategory, c)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50"
                >
                  <Tag size={14} className="shrink-0 text-brand-600" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && results.items.length > 0 && (
            <div>
              <p className="border-t border-gray-100 px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Items
              </p>
              {results.items.map((it) => (
                <button
                  key={`item-${it.product_id}`}
                  onClick={() => pick(onSelectItem, it)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50"
                >
                  <Package size={14} className="shrink-0 text-gray-500" />
                  <span className="min-w-0 truncate">
                    {it.product_name}
                    {it.variant_code_or_size && (
                      <span className="text-gray-400"> — {it.variant_code_or_size}</span>
                    )}
                  </span>
                  {it.category_name && (
                    <span className="ml-auto shrink-0 text-xs text-gray-400">{it.category_name}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {!loading && results.vendors.length > 0 && (
            <div>
              <p className="border-t border-gray-100 px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Vendors
              </p>
              {results.vendors.map((v) => (
                <button
                  key={`vendor-${v.id}`}
                  onClick={() => pick(onSelectVendor, v)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50"
                >
                  <Building2 size={14} className="shrink-0 text-brand-600" />
                  <span className="truncate">{v.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}