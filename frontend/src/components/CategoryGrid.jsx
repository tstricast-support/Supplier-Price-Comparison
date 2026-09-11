import { Tag, ChevronRight } from 'lucide-react'

/** Step 1 of the Items tab: pick a category, A-Z. */
export default function CategoryGrid({ categories, loading, onSelect }) {
  if (loading) return <p className="py-10 text-center text-sm text-gray-500">Loading categories...</p>
  if (categories.length === 0) return <p className="py-10 text-center text-sm text-gray-500">No categories yet.</p>

  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
      {categories.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Tag size={16} className="text-brand-600" />
              </div>
              <span className="font-medium text-gray-900">{c.name}</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </li>
      ))}
    </ul>
  )
}