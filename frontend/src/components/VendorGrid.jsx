import { useState, useMemo } from 'react'
import { Search, Building2, ChevronRight } from 'lucide-react'

/** Step 1 of Vendor View: all vendors, A-Z, searchable. */
export default function VendorGrid({ suppliers, loading, onSelect }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...suppliers].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return sorted
    return sorted.filter((s) => s.name.toLowerCase().includes(q))
  }, [suppliers, search])

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading vendors...</p>}
      {!loading && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">No vendors found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onSelect(s)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <Building2 size={16} className="text-brand-600" />
                  </div>
                  <span className="font-medium text-gray-900">{s.name}</span>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}