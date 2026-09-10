// Groups a raw price-history list (newest first, from the API) into one
// data point per ISO week for the trend chart. Each week's point is the
// price AFTER the last change recorded that week. Weeks are returned in
// chronological (oldest -> newest) order, ready for a line chart's x-axis.
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function parseAsUTC(timestamp) {
  const hasTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(timestamp)
  return new Date(hasTZ ? timestamp : `${timestamp}Z`)
}

export function groupHistoryByWeek(history) {
  // history is newest-first from the API; work chronologically instead
  const chronological = [...history].sort(
    (a, b) => parseAsUTC(a.timestamp) - parseAsUTC(b.timestamp)
  )

  const byWeek = new Map()
  for (const entry of chronological) {
    const date = parseAsUTC(entry.timestamp)
    const key = isoWeekKey(date)
    // Later entries in the same week overwrite earlier ones, so we end up
    // with the last price recorded that week.
    byWeek.set(key, {
      weekKey: key,
      date,
      price: entry.new_price,
      changedBy: entry.changed_by_admin,
      entries: [...(byWeek.get(key)?.entries || []), entry],
    })
  }

  return Array.from(byWeek.values()).map((point, idx, arr) => ({
    ...point,
    label: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))
}
