import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

/** Three-dot menu with Edit / Delete, used everywhere in Manage so a
 * destructive action is never one accidental tap away. */
export default function RowActionsMenu({ onEdit, onDelete, label = 'item' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Actions for ${label}`}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}