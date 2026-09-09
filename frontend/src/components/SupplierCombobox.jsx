import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Building2, Search } from 'lucide-react'

export default function SupplierCombobox({ suppliers, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const selected = suppliers.find((s) => String(s.id) === String(value))

  // Show the selected supplier's name in the box when closed;
  // show whatever the admin is typing when open.
  useEffect(() => {
    if (!open) setQuery(selected ? selected.name : '')
  }, [selected, open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter((s) => s.name.toLowerCase().includes(q))
  }, [suppliers, query])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (supplier) => {
    onChange(String(supplier.id))
    setQuery(supplier.name)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-72">
      <div className="relative">
        <Building2
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search supplier..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No suppliers found</div>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                String(s.id) === String(value) ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}