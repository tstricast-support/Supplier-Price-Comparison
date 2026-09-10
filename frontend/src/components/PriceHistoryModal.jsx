import { useEffect, useMemo, useState } from 'react'
import { X, History, TrendingUp, TrendingDown } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
} from 'recharts'
import { getPriceHistory } from '../api/endpoints'
import { formatRs, unitSuffix } from '../utils/currency'
import { buildPriceTrend } from '../utils/history'

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

// Dot on every point, bigger + filled on the selected one. Tapping a dot
// is the ONLY way the "current price" badge above the chart changes - no
// separate hover/tooltip mechanism, so there's never a mismatch between
// which dot looks selected and which price is displayed.
function makeDot(selectedKey, onPick) {
  return function ClickableDot(props) {
    const { cx, cy, payload } = props
    const isSelected = payload.key === selectedKey
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => onPick(payload.key)}>
        <circle cx={cx} cy={cy} r={14} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 5 : 3}
          fill={isSelected ? '#16a34a' : '#ffffff'}
          stroke="#16a34a"
          strokeWidth={2}
        />
      </g>
    )
  }
}

/**
 * cellInfo carries: productName, supplierName, total_length_or_quantity,
 * pricing_mode - needed to convert stored total prices into unit prices.
 */
export default function PriceHistoryModal({ supplierProductId, cellInfo, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)

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

  const quantity = cellInfo?.total_length_or_quantity
  const suffix = unitSuffix(cellInfo?.pricing_mode)

  const trendPoints = useMemo(() => buildPriceTrend(history, quantity), [history, quantity])

  useEffect(() => {
    if (trendPoints.length > 0) {
      setSelectedKey(trendPoints[trendPoints.length - 1].key)
    }
  }, [supplierProductId, trendPoints.length])

  const chartData = useMemo(
    () => trendPoints.map((p) => ({ key: p.key, label: p.label, unitPrice: p.unitPrice })),
    [trendPoints]
  )

  const changeList = useMemo(
    () => trendPoints.filter((p) => p.key !== 'start').slice().reverse(),
    [trendPoints]
  )

  const selectedPoint = useMemo(
    () => trendPoints.find((p) => p.key === selectedKey) || null,
    [trendPoints, selectedKey]
  )

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto']
    const values = chartData.map((d) => d.unitPrice)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.15 || max * 0.1 || 1
    return [Math.max(0, min - pad), max + pad]
  }, [chartData])

  if (!supplierProductId) return null

  const missingQuantity = !quantity

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

          {!loading && !err && missingQuantity && (
            <p className="px-5 py-8 text-center text-sm text-red-600">
              Missing quantity for this item, so a unit price can't be calculated.
            </p>
          )}

          {!loading && !err && !missingQuantity && chartData.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No price changes recorded yet for this vendor.
            </p>
          )}

          {!loading && !err && chartData.length > 0 && (
            <>
              <div className="border-b border-gray-100 px-3 py-4">
                <div className="mb-2 flex items-baseline justify-between px-2">
                  <p className="text-xs font-medium text-gray-500">Unit price over time (/ {suffix})</p>
                  {selectedPoint && (
                    <p className="text-sm font-semibold text-gray-900">
                      {formatRs(selectedPoint.unitPrice, 2)}
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        {selectedPoint.key === 'start' ? 'Start' : selectedPoint.label}
                      </span>
                    </p>
                  )}
                </div>
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        width={44}
                        domain={yDomain}
                        tickFormatter={(v) => Math.round(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="unitPrice"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        fill="url(#priceGradient)"
                        dot={makeDot(selectedKey, setSelectedKey)}
                        activeDot={{ r: 6, onClick: (_, p) => setSelectedKey(p.payload.key) }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="px-5 py-4">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  All changes <span className="text-gray-400">(/ {suffix})</span>
                </p>

                <ul className="space-y-2">
                  <li
                    onClick={() => setSelectedKey('start')}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border border-dashed px-3 py-2 text-xs ${
                      selectedKey === 'start' ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    <span>Starting price</span>
                    <span className="font-medium text-gray-700">
                      {formatRs(trendPoints[0]?.unitPrice, 2)} / {suffix}
                    </span>
                  </li>

                  {changeList.map((point) => {
                    const increased = point.entry.new_price > point.entry.old_price
                    const isSelected = point.key === selectedKey
                    return (
                      <li
                        key={point.key}
                        onClick={() => setSelectedKey(point.key)}
                        className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 ${
                          isSelected ? 'border-brand-300 bg-brand-50' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 line-through">
                              {formatRs(point.entry.old_price / quantity, 2)}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatRs(point.entry.new_price / quantity, 2)}
                            </span>
                            <span className="text-xs text-gray-400">/ {suffix}</span>
                            {increased ? (
                              <TrendingUp size={14} className="text-red-500" />
                            ) : (
                              <TrendingDown size={14} className="text-green-600" />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Changed by <span className="font-medium">{point.entry.changed_by_admin}</span>
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-gray-400">
                          {formatDateTime(point.entry.timestamp)}
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