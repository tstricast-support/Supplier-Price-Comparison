export function formatRs(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return 'Rs. —'
  return `Rs. ${Number(value).toLocaleString('en-LK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function unitSuffix(pricingMode) {
  if (pricingMode === 'sq_inch') return 'sq in'
  if (pricingMode === 'sq_feet') return 'sq ft'
  return 'unit'
}

export function formatMeasurement(offer) {
  const { pricing_mode, length, length_unit, width, width_unit, total_length_or_quantity } = offer

  if (pricing_mode === 'sq_inch' || pricing_mode === 'sq_feet') {
    const areaLabel = pricing_mode === 'sq_inch' ? 'sq in' : 'sq ft'
    if (length && width) {
      return `${length}${length_unit} × ${width}${width_unit} (${total_length_or_quantity} ${areaLabel})`
    }
    return `${total_length_or_quantity} ${areaLabel}`
  }

  return `${total_length_or_quantity} units`
}
