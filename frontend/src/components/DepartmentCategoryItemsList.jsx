import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronDown, ChevronRight, Package, CornerDownRight, Pencil, History } from 'lucide-react'
import { formatRs, formatMeasurement, unitSuffix } from '../utils/currency'
import useLongPress from '../utils/useLongPress'
import ConfirmDialog from './ConfirmDialog'
import SubitemCreateModal from './SubitemCreateModal'

/**
 * Browse flow, flattened to match the Items tab: one row per item+vendor
 * offer (item name, variant if any, vendor name, unit price), collapsed by
 * default - tap a row to reveal Price Edit / History. Items with no vendor
 * price yet still show one row with an "Add vendor price" action instead
 * of a price.
 *
 * Subitems (an item nested inside another) are never their own top-level
 * row here - the backend already excludes them from `items`. Each parent
 * row instead carries its immediate children in `item.subitems`, which are
 * rendered as an indented sub-list right under that parent's row.
 */
export default function DepartmentCategoryItemsList({
  department,
  category,
  items = [],
  loading,
  onBack,
  onAddVendor,
  onEditVendor,
  onHistoryVendor,
  onSubitemCreated,
}) {
  const [search, setSearch] = useState('')
  const [expandedKey, setExpandedKey] = useState(null)

  // Flatten items -> one row per vendor offer. Items with zero vendors
  // still get a single placeholder row so "Add vendor" stays reachable.
  // Subitems travel along with their parent row (not flattened here) so
  // they can be rendered nested underneath it.
  const rows = useMemo(() => {
    const out = []
    ;(items || []).forEach((item) => {
      if (!item.vendors || item.vendors.length === 0) {
        out.push({
          key: `item-${item.product_id}`,
          item,
          vendor: null,
        })
      } else {
        item.vendors.forEach((v) => {
          out.push({
            key: `sp-${v.supplier_product_id}`,
            item,
            vendor: v,
          })
        })
      }
    })
    return out
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      if (
        r.item.product_name.toLowerCase().includes(q) ||
        (r.item.variant_code_or_size || '').toLowerCase().includes(q) ||
        (r.vendor?.supplier_name || '').toLowerCase().includes(q)
      ) {
        return true
      }
      // Also match if the search hits one of this item's subitems, so a
      // subitem search doesn't just disappear because its parent row's own
      // text didn't match.
      return (r.item.subitems || []).some(
        (s) =>
          s.product_name.toLowerCase().includes(q) ||
          (s.variant_code_or_size || '').toLowerCase().includes(q) ||
          (s.vendors || []).some((v) => v.supplier_name.toLowerCase().includes(q))
      )
    })
  }, [rows, search])

  const toggleExpanded = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key))
  }

  const [subitemConfirmTarget, setSubitemConfirmTarget] = useState(null) // { item, vendor }
  const [subitemCreateTarget, setSubitemCreateTarget] = useState(null)

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          <ChevronLeft size={16} /> {department.name}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">{category.category_name || category.name}</span>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items or vendors..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading items...</p>}
      {!loading && filtered.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No items in this category yet.</p>}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-2.5">
          {filtered.map((row) => (
            <Row
              key={row.key}
              row={row}
              isOpen={expandedKey === row.key}
              onToggle={() => row.vendor && toggleExpanded(row.key)}
              onAddVendor={onAddVendor}
              onEditVendor={onEditVendor}
              onHistoryVendor={onHistoryVendor}
              onLongPress={() => setSubitemConfirmTarget(row)}
              onSubitemLongPress={(sub) => setSubitemConfirmTarget({ item: sub, vendor: sub.vendors?.[0] || null })}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!subitemConfirmTarget}
        danger={false}
        title="Create a subitem?"
        message={
          subitemConfirmTarget
            ? `Create a new item inside "${subitemConfirmTarget.item.product_name}"?`
            : ''
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
          parent={{ id: subitemCreateTarget.item.product_id, name: subitemCreateTarget.item.product_name }}
          supplier={
            subitemCreateTarget.vendor
              ? { id: subitemCreateTarget.vendor.supplier_id, name: subitemCreateTarget.vendor.supplier_name }
              : undefined
          }
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
function Row({ row, isOpen, onToggle, onAddVendor, onEditVendor, onHistoryVendor, onLongPress, onSubitemLongPress }) {
  const { item, vendor } = row
  const longPress = useLongPress(onLongPress, onToggle)
  const subitems = item.subitems || []
  const [subitemsOpen, setSubitemsOpen] = useState(false)
  const [expandedSubKey, setExpandedSubKey] = useState(null)

  return (
    <li className="rounded-xl border border-gray-200 bg-white shadow-sm">
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
            <p className="text-xs text-gray-500">
              {vendor ? (
                <>
                  {vendor.supplier_name} ·{' '}
                  <span className="font-semibold text-gray-700">Total {formatRs(vendor.total_price)}</span>{' '}
                  for {formatMeasurement(vendor)}
                </>
              ) : (
                'No vendor prices yet'
              )}
            </p>
          </div>
        </div>

        {vendor ? (
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{formatRs(vendor.unit_price, 2)}</p>
              <p className="text-xs text-gray-500">/ {unitSuffix(vendor.pricing_mode)}</p>
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddVendor(item)
            }}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Add vendor
          </button>
        )}
      </button>

      {isOpen && vendor && (
        <div className="flex gap-2 border-t border-gray-100 p-4 pt-3">
          <button
            onClick={() => onEditVendor(item, vendor)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Pencil size={13} /> Price Edit
          </button>
          <button
            onClick={() => onHistoryVendor(item, vendor)}
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
                  isOpen={expandedSubKey === sub.product_id}
                  onToggle={() =>
                    (sub.vendors || []).length > 0 &&
                    setExpandedSubKey((prev) => (prev === sub.product_id ? null : sub.product_id))
                  }
                  onAddVendor={onAddVendor}
                  onEditVendor={onEditVendor}
                  onHistoryVendor={onHistoryVendor}
                  onLongPress={() => onSubitemLongPress(sub)}
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
 * Price Edit / History, same as a top-level row. If it has no vendor yet,
 * shows "Add vendor" instead. */
function SubitemRow({ subitem, isOpen, onToggle, onAddVendor, onEditVendor, onHistoryVendor, onLongPress }) {
  const vendor = (subitem.vendors && subitem.vendors[0]) || null
  const longPress = useLongPress(onLongPress, onToggle)

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
            <p className="text-xs text-gray-500">
              {vendor ? (
                <>
                  {vendor.supplier_name} ·{' '}
                  <span className="font-semibold text-gray-700">Total {formatRs(vendor.total_price)}</span>{' '}
                  for {formatMeasurement(vendor)}
                </>
              ) : (
                'No vendor prices yet'
              )}
            </p>
          </div>
        </div>

        {vendor ? (
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
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddVendor(subitem)
            }}
            className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
          >
            Add vendor
          </button>
        )}
      </button>

      {isOpen && vendor && (
        <div className="flex gap-2 border-t border-gray-100 p-3 pt-2.5">
          <button
            onClick={() => onEditVendor(subitem, vendor)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Pencil size={12} /> Price Edit
          </button>
          <button
            onClick={() => onHistoryVendor(subitem, vendor)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            <History size={12} /> History
          </button>
        </div>
      )}
    </li>
  )
}