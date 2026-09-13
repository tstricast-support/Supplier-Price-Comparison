import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ChevronLeft, ChevronDown, ChevronRight, CornerDownRight, Package, Pencil, History } from 'lucide-react'
import { formatRs, unitSuffix } from '../utils/currency'
import useLongPress from '../utils/useLongPress'
import ConfirmDialog from './ConfirmDialog'
import SubitemCreateModal from './SubitemCreateModal'

/** Items tab, single screen: every vendor offer for every item in this
 * category. Each row is collapsed by default - tap it to reveal Price Edit
 * / History. If `highlightProductId` is set (e.g. from the global search
 * bar), the matching row auto-expands and scrolls into view. Subitems (if
 * any) render as an indented sub-list right under their parent row. */
export default function CategoryVendorItemList({ category, items, loading, onBack, onEdit, onHistory, highlightProductId, onSubitemCreated }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const rowRefs = useRef({})

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.product_name.toLowerCase().includes(q) ||
        (it.variant_code_or_size || '').toLowerCase().includes(q) ||
        it.supplier_name.toLowerCase().includes(q) ||
        (it.department_name || '').toLowerCase().includes(q) ||
        (it.subitems || []).some(
          (s) =>
            s.product_name.toLowerCase().includes(q) ||
            (s.variant_code_or_size || '').toLowerCase().includes(q) ||
            (s.vendors || []).some((v) => v.supplier_name.toLowerCase().includes(q))
        )
    )
  }, [items, search])

  useEffect(() => {
    if (!highlightProductId || items.length === 0) return
    const match = items.find((it) => it.product_id === highlightProductId)
    if (match) {
      setExpandedId(match.supplier_product_id)
      setTimeout(() => {
        rowRefs.current[match.supplier_product_id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [highlightProductId, items])

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const [subitemConfirmTarget, setSubitemConfirmTarget] = useState(null) // item row (or flattened subitem row)
  const [subitemCreateTarget, setSubitemCreateTarget] = useState(null)

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          <ChevronLeft size={16} /> Categories
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">{category.name}</span>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter items or vendors in this category..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading items...</p>}
      {!loading && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">No priced items in this category yet.</p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-2.5">
          {filtered.map((item) => (
            <Row
              key={item.supplier_product_id}
              item={item}
              isOpen={expandedId === item.supplier_product_id}
              isHighlighted={highlightProductId === item.product_id}
              rowRef={(el) => { rowRefs.current[item.supplier_product_id] = el }}
              onToggle={() => toggleExpanded(item.supplier_product_id)}
              onEdit={onEdit}
              onHistory={onHistory}
              onLongPress={() => setSubitemConfirmTarget(item)}
              onSubitemLongPress={(flatSub) => setSubitemConfirmTarget(flatSub)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!subitemConfirmTarget}
        danger={false}
        title="Create a subitem?"
        message={
          subitemConfirmTarget ? `Create a new item inside "${subitemConfirmTarget.product_name}"?` : ''
        }
        confirmLabel="Create Subitem"
        onCancel={() => setSubitemConfirmTarget(null)}
        onConfirm={() => {
          setSubitemCreateTarget(subitemConfirmTarget)
          setSubitemConfirmTarget(null)
        }}
      />

      {subitemCreateTarget && (
        <SubitemCreateModal
          parent={{ id: subitemCreateTarget.product_id, name: subitemCreateTarget.product_name }}
          supplier={{ id: subitemCreateTarget.supplier_id, name: subitemCreateTarget.supplier_name }}
          onClose={() => setSubitemCreateTarget(null)}
          onCreated={() => {
            setSubitemCreateTarget(null)
            onSubitemCreated && onSubitemCreated()
          }}
        />
      )}
    </div>
  )
}

/** One item+vendor row. Long-press (or press-and-hold with a mouse) offers
 * to create a subitem; a normal tap toggles the row open as before.
 * Its subitems (if any) render as an indented sub-list right underneath. */
function Row({ item, isOpen, isHighlighted, rowRef, onToggle, onEdit, onHistory, onLongPress, onSubitemLongPress }) {
  const longPress = useLongPress(onLongPress, onToggle)
  const subitems = item.subitems || []
  const [subitemsOpen, setSubitemsOpen] = useState(false)
  const [expandedSubKey, setExpandedSubKey] = useState(null)

  return (
    <li
      ref={rowRef}
      className={`rounded-xl border bg-white shadow-sm ${isHighlighted ? 'border-brand-400 ring-2 ring-brand-100' : 'border-gray-200'}`}
    >
      <button {...longPress} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 rounded-lg bg-gray-100 p-2">
            <Package size={16} className="text-gray-500" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate font-semibold text-gray-900">{item.product_name}</p>
              {item.variant_code_or_size && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  {item.variant_code_or_size}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-500">{item.supplier_name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatRs(item.unit_price, 2)}</p>
            <p className="text-xs text-gray-500">/ {unitSuffix(item.pricing_mode)}</p>
          </div>
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="flex gap-2 border-t border-gray-100 p-4 pt-3">
          <button
            onClick={() => onEdit(item)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Pencil size={13} /> Price Edit
          </button>
          <button
            onClick={() => onHistory(item)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            <History size={13} /> History
          </button>
        </div>
      )}

      {subitems.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setSubitemsOpen((prev) => !prev)}
            className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <ChevronRight size={14} className={`transition-transform ${subitemsOpen ? 'rotate-90' : ''}`} />
            {subitems.length} subitem{subitems.length === 1 ? '' : 's'}
          </button>

          {subitemsOpen && (
            <ul className="space-y-2 px-3 pb-3">
              {subitems.map((sub) => (
                <SubitemRow
                  key={sub.product_id}
                  subitem={sub}
                  parentDepartmentId={item.department_id}
                  isOpen={expandedSubKey === sub.product_id}
                  onToggle={() =>
                    (sub.vendors || []).length > 0 &&
                    setExpandedSubKey((prev) => (prev === sub.product_id ? null : sub.product_id))
                  }
                  onEdit={onEdit}
                  onHistory={onHistory}
                  onLongPress={(flatSub) => onSubitemLongPress(flatSub)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

/** A subitem, indented under its parent. Shows its first vendor price (a
 * subitem normally has just one, created together with it) - tap to reveal
 * Price Edit / History, same as a top-level row. Long-press offers to
 * create a subitem inside this subitem, same as any other row. */
function SubitemRow({ subitem, parentDepartmentId, isOpen, onToggle, onEdit, onHistory, onLongPress }) {
  const vendor = (subitem.vendors && subitem.vendors[0]) || null

  // Flatten into the same shape as a top-level row so onEdit/onHistory/
  // subitem-creation all work unchanged, regardless of nesting depth.
  const flat = vendor && {
    supplier_product_id: vendor.supplier_product_id,
    product_id: subitem.product_id,
    product_name: subitem.product_name,
    variant_code_or_size: subitem.variant_code_or_size,
    supplier_id: vendor.supplier_id,
    supplier_name: vendor.supplier_name,
    department_id: parentDepartmentId,
    pricing_mode: vendor.pricing_mode,
    length: vendor.length,
    length_unit: vendor.length_unit,
    width: vendor.width,
    width_unit: vendor.width_unit,
    total_price: vendor.total_price,
    total_length_or_quantity: vendor.total_length_or_quantity,
    unit_price: vendor.unit_price,
    is_cheapest: vendor.is_cheapest,
  }

  const longPress = useLongPress(() => flat && onLongPress(flat), onToggle)

  return (
    <li className="rounded-lg border border-gray-100 bg-gray-50/60">
      <button {...longPress} className="flex w-full items-start justify-between gap-3 p-3 pl-2 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <CornerDownRight size={14} className="shrink-0 text-gray-400" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-medium text-gray-900">{subitem.product_name}</p>
              {subitem.variant_code_or_size && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  {subitem.variant_code_or_size}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-500">
              {vendor ? vendor.supplier_name : 'No vendor prices yet'}
            </p>
          </div>
        </div>

        {vendor && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{formatRs(vendor.unit_price, 2)}</p>
              <p className="text-[11px] text-gray-500">/ {unitSuffix(vendor.pricing_mode)}</p>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        )}
      </button>

      {isOpen && vendor && (
        <div className="flex gap-2 border-t border-gray-100 p-3 pt-2.5">
          <button
            onClick={() => onEdit(flat)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Pencil size={12} /> Price Edit
          </button>
          <button
            onClick={() => onHistory(flat)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            <History size={12} /> History
          </button>
        </div>
      )}
    </li>
  )
}