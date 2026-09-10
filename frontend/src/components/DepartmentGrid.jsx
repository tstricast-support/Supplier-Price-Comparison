import { useState } from 'react'
import { Layers, ChevronRight } from 'lucide-react'

// Maps each department's stable `code` (from the backend, e.g. "i_lab") to
// its logo file in /public/logos. Falls back to the generic icon if a
// department has no code yet, or its logo file is missing/fails to load.
const DEPARTMENT_LOGOS = {
  i_lab: '/logos/i-lab.png',
  i_photobook: '/logos/i-photobook.png',
  i_lab_std: '/logos/i-lab-std.png',
  dd_engineering: '/logos/dd-engineering.png',
}

function DepartmentLogo({ department }) {
  const logoSrc = department.code ? DEPARTMENT_LOGOS[department.code] : null
  const [failed, setFailed] = useState(false)

  if (!logoSrc || failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        <Layers size={20} className="text-brand-600" />
      </div>
    )
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-gray-100">
      <img
        src={logoSrc}
        alt={`${department.name} logo`}
        className="h-full w-full object-contain p-1"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

/** Step 1 of Browse: pick a department. Big tappable cards for mobile. */
export default function DepartmentGrid({ departments, loading, onSelect }) {
  if (loading) {
    return <p className="py-10 text-center text-sm text-gray-500">Loading departments...</p>
  }
  if (departments.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No departments yet.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {departments.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d)}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <DepartmentLogo department={d} />
            <span className="text-base font-semibold text-gray-900">{d.name}</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      ))}
    </div>
  )
}
