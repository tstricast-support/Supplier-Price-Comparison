import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, PlusCircle, Download, Trash2, Search, Pencil, MoreVertical, Share2 } from 'lucide-react'
import {
  getDepartments,
  getPurchaseOrders,
  getPurchaseOrder,
  deletePurchaseOrder,
} from '../api/endpoints'
import { formatRs } from '../utils/currency'
import printPurchaseOrder from '../utils/printPurchaseOrder'
import CreatePOModal from './CreatePOModal'
import ConfirmDialog from './ConfirmDialog'
import { generatePOPdfBlob } from '../utils/generatePOPdf'

function toWhatsAppNumber(phone, defaultCountryCode = '94') {
  let digits = (phone || '').replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) {
    digits = defaultCountryCode + digits.slice(1) // 0771234567 -> 94771234567
  } else if (!digits.startsWith(defaultCountryCode) && digits.length <= 10) {
    digits = defaultCountryCode + digits // bare 771234567 -> 94771234567
  }
  return digits
}

function buildWhatsAppUrl(po) {
  const number = toWhatsAppNumber(po.supplier_phone)
  const message =
    `Purchase Order ${po.po_number}\n` +
    `Department: ${po.department_name}\n` +
    `Date: ${new Date(po.po_date).toLocaleDateString()}\n` +
    `Items: ${po.line_count}\n` +
    `Total: Rs. ${po.total.toLocaleString()}\n\n` +
    `Please find the PO attached / to follow. Thank you.`
  const base = number ? `https://wa.me/${number}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(message)}`
}

/**
 * PO tab. Purchase orders are filed under the department they were issued
 * for, so picking a department shows only that department's POs. Each saved
 * PO reprints from its stored snapshot, so downloading it again always
 * gives the same PDF.
 */
export default function PurchaseOrderTab() {
  const [departments, setDepartments] = useState([])
  const [deptId, setDeptId] = useState(null) // null = every department
  const [orders, setOrders] = useState([])
  const [query, setQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState('') // '' = all months, else 'YYYY-MM'
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPO, setEditingPO] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)

  useEffect(() => {
    getDepartments()
      .then(({ data }) => setDepartments(data))
      .catch(() => setErr('Could not load departments.'))
  }, [])

  const loadOrders = () => {
    setLoading(true)
    getPurchaseOrders(deptId)
      .then(({ data }) => {
        setOrders(data)
        setErr(null)
      })
      .catch(() => setErr('Could not load purchase orders.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadOrders, [deptId])

    const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      const matchesQuery =
        !q ||
        o.po_number.toLowerCase().includes(q) ||
        (o.supplier_name || '').toLowerCase().includes(q) ||
        o.department_name.toLowerCase().includes(q)
      const matchesMonth = !monthFilter || (o.po_date || '').slice(0, 7) === monthFilter
      return matchesQuery && matchesMonth
    })
  }, [orders, query, monthFilter])

    // Only grouped when viewing every department - a single department chip
  // already scopes the list, so grouping there would just be one section.
  const grouped = useMemo(() => {
    if (deptId !== null) return null
    const byDept = new Map()
    for (const po of filtered) {
      if (!byDept.has(po.department_name)) byDept.set(po.department_name, [])
      byDept.get(po.department_name).push(po)
    }
    return [...byDept.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered, deptId])

  const handleDownload = async (poId) => {
    // Open the window inside the click handler so iOS Safari keeps it.
    const win = window.open('', '_blank')
    try {
      const { data } = await getPurchaseOrder(poId)
      printPurchaseOrder(data, win)
    } catch {
      win?.close()
      setErr('Could not open that purchase order.')
    }
  }

    const handleShare = async (po) => {
    try {
      const { data: fullPo } = await getPurchaseOrder(po.id)
      const blob = await generatePOPdfBlob(fullPo)
      const file = new File([blob], `${po.po_number}.pdf`, { type: 'application/pdf' })

      const message =
        `Purchase Order ${po.po_number}\n` +
        `Department: ${po.department_name}\n` +
        `Total: Rs. ${po.total.toLocaleString()}\n\n` +
        `Please find the PO attached. Thank you.`

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: po.po_number, text: message })
        return
      }

      // Desktop / unsupported browsers: no scriptable way to attach a
      // file to WhatsApp, so download the PDF and open WhatsApp with the
      // text pre-filled - the person attaches the just-downloaded file.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${po.po_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      window.open(buildWhatsAppUrl(po), '_blank')
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setErr('Could not share that purchase order.')
      }
    }
  }

  const handleEdit = async (poId) => {
    setOpenMenuId(null)
    try {
      const { data } = await getPurchaseOrder(poId)
      setEditingPO(data)
    } catch {
      setErr('Could not open that purchase order for editing.')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deletePurchaseOrder(confirmDelete.id)
      setConfirmDelete(null)
      loadOrders()
    } catch {
      setErr('Could not delete that purchase order.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <FileText size={18} className="text-brand-600" />
          Purchase Orders
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.98]"
        >
          <PlusCircle size={16} />
          Create purchase order
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <DeptChip active={deptId === null} onClick={() => setDeptId(null)}>
          All departments
        </DeptChip>
        {departments.map((d) => (
          <DeptChip key={d.id} active={deptId === d.id} onClick={() => setDeptId(d.id)}>
            {d.name}
          </DeptChip>
        ))}
      </div>

            <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by PO number or vendor"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="relative">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {monthFilter && (
            <button
              onClick={() => setMonthFilter('')}
              title="Clear month filter"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] text-gray-500 hover:bg-gray-50"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {loading && <p className="text-sm text-gray-400">Loading purchase orders…</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No purchase orders here yet. Create one and it gets filed under its department.
          </p>
        </div>
      )}

      {grouped ? (
        <div className="space-y-5">
          {grouped.map(([deptName, deptOrders]) => (
            <div key={deptName}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{deptName}</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  {deptOrders.length}
                </span>
              </div>
              <div className="space-y-2">
                {deptOrders.map((po) => (
                  <POOrderRow
                    key={po.id}
                    po={po}
                    onDownload={handleDownload}
                    onShare={handleShare}
                    onEdit={handleEdit}
                    onDelete={setConfirmDelete}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((po) => (
            <POOrderRow
              key={po.id}
              po={po}
              onDownload={handleDownload}
              onShare={handleShare}
              onEdit={handleEdit}
              onDelete={setConfirmDelete}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
            />
          ))}
        </div>
      )}

      {(showCreate || editingPO) && (
        <CreatePOModal
          departments={departments}
          defaultDepartmentId={deptId}
          editingPO={editingPO}
          onClose={() => {
            setShowCreate(false)
            setEditingPO(null)
          }}
          onCreated={(po) => {
            setShowCreate(false)
            setEditingPO(null)
            setDeptId(po.department_id)
            loadOrders()
            printPurchaseOrder(po)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete purchase order"
          message={`Delete ${confirmDelete.po_number}? This removes it from ${confirmDelete.department_name}.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

/**
 * Overflow menu for a PO row (Edit / Delete), triggered by a three-dot
 * button. Keeping these two actions behind a menu - instead of bare icon
 * buttons next to PDF - means a stray tap can't delete or edit a PO by
 * accident; the person has to open the menu first, which is a deliberate
 * action, then pick from it.
 */
function PORowMenu({ open, onToggle, onClose, onEdit, onDelete }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        title="More actions"
        className={`rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 ${
          open ? 'bg-gray-50' : ''
        }`}
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            onClick={onEdit}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={13} />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function DeptChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function POOrderRow({ po, onDownload, onShare, onEdit, onDelete, openMenuId, setOpenMenuId }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{po.po_number}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {po.department_name}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {new Date(po.po_date).toLocaleDateString()} · {po.supplier_name || 'No vendor'} ·{' '}
          {po.line_count} item{po.line_count === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{formatRs(po.total)}</span>
        <button
          onClick={() => onDownload(po.id)}
          title="Download PDF"
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download size={14} />
          PDF
        </button>
        <button
          onClick={() => onShare(po)}
          title={po.supplier_phone ? `Share PDF on WhatsApp to ${po.supplier_phone}` : 'Share PDF on WhatsApp'}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
        >
          <Share2 size={14} />
        </button>
        <PORowMenu
          open={openMenuId === po.id}
          onToggle={() => setOpenMenuId((cur) => (cur === po.id ? null : po.id))}
          onClose={() => setOpenMenuId(null)}
          onEdit={() => onEdit(po.id)}
          onDelete={() => {
            setOpenMenuId(null)
            onDelete(po)
          }}
        />
      </div>
    </div>
  )
}