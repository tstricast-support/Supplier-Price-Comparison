import { useEffect, useMemo, useState } from 'react'
import { X, History, TrendingUp, TrendingDown } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Dot,
} from 'recharts'
import { getPriceHistory } from '../api/endpoints'
import { formatRs } from '../utils/currency'
import { groupHistoryByWeek } from '../utils/history'

function parseAsUTC(timestamp) {
  const hasTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(timestamp)
  return new Date(hasTZ ? timestamp : `${timestamp}Z`)
}

function formatDateTime(timestamp) {
  return parseAsUTC(timestamp).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// Custom dot so the selected week's point stands out and every point is
// tappable (bigger invisible hit target for mobile).
function makeDot(selectedWeekKey, onPick) {
  return function ClickableDot(props) {
    const { cx, cy, payload } = props
    const isSelected = payload.weekKey === selectedWeekKey
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => onPick(payload.weekKey)}>
        <circle cx={cx} cy={cy} r={14} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 6 : 4}
          fill={isSelected ? '#4f46e5' : '#ffffff'}
          stroke="#4f46e5"
          strokeWidth={2}
        />
      </g>
    )
  }
}

export default function PriceHistoryModal({ supplierProductId, cellInfo, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [selectedWeekKey, setSelectedWeekKey] = useState(null)

  useEffect(() => {
    if (!supplierProductId) return
    setLoading(true)
    getPriceHistory(supplierProductId)
      .then(({ data }) => {
        setHistory(data)
        setErr(null)
      })
      .catch((e) => setErr(e.response?.data?.detail || 'Failed to load price history.'))
      .finally(() => setLoading(false))
  }, [supplierProductId])

  const weeklyPoints = useMemo(() => groupHistoryByWeek(history), [history])

  useEffect(() => {
    // Default to the most recent week once data loads
    if (weeklyPoints.length > 0) {
      setSelectedWeekKey(weeklyPoints[weeklyPoints.length - 1].weekKey)
    }
  }, [supplierProductId, weeklyPoints.length])

  const chartData = useMemo(
    () => weeklyPoints.map((p) => ({ weekKey: p.weekKey, label: p.label, price: p.price })),
    [weeklyPoints]
  )

  const selectedWeekEntries = useMemo(() => {
    const week = weeklyPoints.find((p) => p.weekKey === selectedWeekKey)
    if (!week) return []
    return [...week.entries].sort((a, b) => parseAsUTC(b.timestamp) - parseAsUTC(a.timestamp))
  }, [weeklyPoints, selectedWeekKey])

  if (!supplierProductId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Price History</h2>
              {cellInfo && (
                <p className="text-xs text-gray-500">
                  {cellInfo.productName} - {cellInfo.supplierName}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-64px)] overflow-y-auto">
          {loading && <p className="px-5 py-8 text-center text-sm text-gray-500">Loading history...</p>}
          {err && <p className="px-5 py-8 text-center text-sm text-red-600">{err}</p>}

          {!loading && !err && chartData.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No price changes recorded yet for this vendor.
            </p>
          )}

          {!loading && !err && chartData.length > 0 && (
            <>
              <div className="border-b border-gray-100 px-3 py-4">
                <p className="mb-2 px-2 text-xs font-medium text-gray-500">Price by week - tap a point for details</p>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={56}
                        tickFormatter={(v) => `Rs.${Math.round(v)}`}
                      />
                      <Tooltip
                        formatter={(v) => [formatRs(v), 'Price']}
                        labelFormatter={(label) => `Week of ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        dot={makeDot(selectedWeekKey, setSelectedWeekKey)}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="px-5 py-4">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Changes {selectedWeekKey ? `- week of ${weeklyPoints.find((w) => w.weekKey === selectedWeekKey)?.label}` : ''}
                </p>

                {selectedWeekEntries.length === 0 && (
                  <p className="text-sm text-gray-500">No changes recorded that week.</p>
                )}

                <ul className="space-y-3">
                  {selectedWeekEntries.map((h) => {
                    const increased = h.new_price > h.old_price
                    return (
                      <li
                        key={h.id}
                        className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 line-through">{formatRs(h.old_price)}</span>
                            <span className="font-semibold text-gray-900">{formatRs(h.new_price)}</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
