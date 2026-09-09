/**
 * Formats a number as Sri Lankan Rupees, e.g. formatRs(5500) -> "Rs. 5,500.00"
 * `decimals` defaults to 2 (use 4 for unit prices where fractions of a rupee matter).
 */
export function formatRs(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return 'Rs. —'
  return `Rs. ${Number(value).toLocaleString('en-LK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}