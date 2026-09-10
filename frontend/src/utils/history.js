function parseAsUTC(timestamp) {
  const hasTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(timestamp)
  return new Date(hasTZ ? timestamp : `${timestamp}Z`)
}

// Turns the raw price-history list (newest first, from the API) into one
// chart point PER RECORDED CHANGE, in chronological order, plus a leading
// "start" point for the price before the very first change.
//
// `quantity` is the item's current total_length_or_quantity, used to
// convert the stored total prices into unit prices (PriceHistory only
// stores total price). Assumes quantity hasn't changed across the history
// shown - true for the normal case of editing price only.
export function buildPriceTrend(history, quantity) {
  if (!history || history.length === 0 || !quantity) return []

  const chronological = [...history].sort(
    (a, b) => parseAsUTC(a.timestamp) - parseAsUTC(b.timestamp)
  )

  const raw = []

  const first = chronological[0]
  raw.push({
    key: 'start',
    date: new Date(parseAsUTC(first.timestamp).getTime() - 1),
    unitPrice: first.old_price / quantity,
    entry: null,
  })

  chronological.forEach((entry) => {
    raw.push({
      key: String(entry.id),
      date: parseAsUTC(entry.timestamp),
      unitPrice: entry.new_price / quantity,
      entry,
    })
  })

  // If several changes happened on the same calendar day, a plain date
  // label ("Sep 10") is identical for all of them and the x-axis can't
  // tell them apart. Switch those points to a time label instead.
  const dayCounts = new Map()
  raw.forEach((p) => {
    const dayKey = p.date.toDateString()
    dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1)
  })

  return raw.map((p) => {
    if (p.key === 'start') return { ...p, label: 'Start' }
    const dayKey = p.date.toDateString()
    const label =
      dayCounts.get(dayKey) > 1
        ? p.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { ...p, label }
  })
}