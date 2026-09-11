import { ChevronLeft, ChevronRight, Tag } from 'lucide-react'

/** Step 2 of Vendor View: categories this vendor has items in, A-Z. */
export default function VendorCategoryList({ supplier, categories, loading, onBack, onSelect }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          <ChevronLeft size={16} /> Vendors
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">{supplier.name}</span>
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading categories...</p>}
      {!loading && categories.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">This vendor has no priced items yet.</p>
      )}

      {!loading && categories.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {categories.map((c) => (
            <li key={c.category_id}>
              <button
                onClick={() => onSelect(c)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100"
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
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}