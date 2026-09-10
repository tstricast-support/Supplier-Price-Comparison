import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, PlusCircle, X } from 'lucide-react'

/**
 * Generic searchable / type-to-filter dropdown. Built for lists that can get
 * long (e.g. 100+ vendors) where a plain <select> becomes hard to scroll.
 *
 * Props:
 *  - options: [{ id, label }]
 *  - value: selected id (string|number) or ''
 *  - onChange(id) - called with '' when the selection is cleared
 *  - placeholder
 *  - onCreateNew(): optional. If provided, an "+ Add new" row/button is
 *    shown (both when there are zero matches, and pinned at the bottom of
 *    the list otherwise) so the user can create the item inline instead of
 *    leaving the form.
 *  - createLabel: label for the create action, e.g. "Create vendor"
 *  - clearLabel: optional. If provided, a pinned "Show all / Clear" row is
 *    shown at the top of the list so the empty state is reachable without
 *    manually deleting every character.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  onCreateNew,
  createLabel = '+ Add new',
  clearLabel,
  icon,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find((o) => String(o.id) === String(value))

  useEffect(() => {
    if (!open) setQuery(selected ? selected.label : '')
  }, [selected, open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (opt) => {
    onChange(String(opt.id))
    setQuery(opt.label)
    setOpen(false)
  }

  // Clears both the typed text and the underlying selection - previously
  // there was no way to actually clear `value`: deleting the text and
  // clicking away just reverted to the old selection's label.
  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const showClearButton = value !== '' && value !== null && value !== undefined

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        {icon || (
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-16 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selection"
            className="absolute right-7 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {clearLabel && (
            <button
              type="button"
              onClick={handleClear}
              className={`flex w-full items-center border-b border-gray-100 px-3 py-2.5 text-left text-sm hover:bg-brand-50 ${
                !value ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700'
              }`}
            >
              {clearLabel}
            </button>
          )}

          {filtered.length === 0 && (
            <div className="px-3 py-3 text-sm text-gray-400">
              No matches{query ? ` for "${query}"` : ''}.
            </div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-brand-50 ${
                String(opt.id) === String(value) ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {onCreateNew && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCreateNew(query.trim())
              }}
              className="flex w-full items-center gap-1.5 border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              <PlusCircle size={14} />
              {createLabel}
              {query ? ` "${query}"` : ''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}