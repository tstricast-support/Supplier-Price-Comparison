import { useEffect, useMemo, useState } from 'react'
import { X, History, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { getPriceHistory } from '../api/endpoints'
import { formatRs } from '../utils/currency'

// The backend stores naive UTC timestamps (no "Z" / offset suffix).
// JS treats a date-time string with no timezone as LOCAL time, which is wrong
// here — so we force it to be parsed as UTC if no timezone info is present.
function parseAsUTC(timestamp) {
  const hasTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(timestamp)
  return new Date(hasTZ ? timestamp : `${timestamp}Z`)
}

// Returns the Monday-start/Sunday-end range for "offset" weeks from the current week.
// offset = 0 -> this week, -1 -> last week, +1 -> next week, etc.
function getWeekRange(offset) {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(now.getDate() + diffToMonday + offset * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function formatWeekLabel(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  const sameYear = start.getFullYear() === end.getFullYear()
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString(
    'en-US',
    sameYear ? opts : { ...opts, year: 'numeric' }
  )
  return `${startStr} – ${endStr}, ${end.getFullYear()}`
}

// Clear "date + time" display for each history row, e.g. "Mon, Sep 8, 2026, 3:45 PM"
function formatDateTime(timestamp) {
  return parseAsUTC(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PriceHistoryModal({ supplierProductId, cellInfo, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    if (!supplierProductId) return
    setLoading(true)
    getPriceHistory(supplierProductId)
      .then(({ data }) => setHistory(data))
      .catch((e) =>
        setErr(e.response?.data?.detail || 'Failed to load price history.')
      )
      .finally(() => setLoading(false))
  }, [supplierProductId])

  // Reset to the current week whenever a new item's history is opened
  useEffect(() => {
    setWeekOffset(0)
  }, [supplierProductId])

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset])

  const filteredHistory = useMemo(() => {
    return history
      .filter((h) => {
        const t = parseAsUTC(h.timestamp)
        return t >= start && t <= end
      })
      .sort((a, b) => parseAsUTC(b.timestamp) - parseAsUTC(a.timestamp)) // newest first
  }, [history, start, end])

  if (!supplierProductId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Price History</h2>
              {cellInfo && (
                <p className="text-xs text-gray-500">
                  {cellInfo.productName} — {cellInfo.supplierName}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2.5">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-200"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
            <CalendarDays size={14} className="text-gray-400" />
            {formatWeekLabel(start, end)}
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="ml-1 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-200"
              >
                This week
              </button>
            )}
          </div>

          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-200"
            aria-label="Next week"
            disabled={weekOffset >= 0}
          >
            <ChevronRight size={16} className={weekOffset >= 0 ? 'opacity-30' : ''} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-gray-500">Loading history...</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {!loading && !err && filteredHistory.length === 0 && (
            <p className="text-sm text-gray-500">No price changes during this week.</p>
          )}

          <ul className="space-y-3">
            {filteredHistory.map((h) => {
              const increased = h.new_price > h.old_price
              return (
                <li
                  key={h.id}
                  className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 line-through">
                        {formatRs(h.old_price)}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatRs(h.new_price)}
                      </span>
                      {increased ? (
                        <TrendingUp size={14} className="text-red-500" />
                      ) : (
                        <TrendingDown size={14} className="text-green-600" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Changed by <span className="font-medium">{h.changed_by_admin}</span>
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-gray-400">
                    {formatDateTime(h.timestamp)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}