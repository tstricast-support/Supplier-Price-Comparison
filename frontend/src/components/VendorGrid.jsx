import { useMemo } from 'react'
import { Building2, ChevronRight } from 'lucide-react'

/** Step 1 of Vendor View: all vendors, A-Z. Searching vendors now happens
 * through the global search bar in the header instead of a local box here. */
export default function VendorGrid({ suppliers, loading, onSelect }) {
  const sorted = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers]
  )

  return (
    <div>
      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading vendors...</p>}
      {!loading && sorted.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">No vendors yet.</p>
      )}

      {!loading && sorted.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {sorted.map((s) => (
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