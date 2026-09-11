function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function unitSuffixLocal(pricingMode) {
  if (pricingMode === 'sq_inch') return 'sq in'
  if (pricingMode === 'sq_feet') return 'sq ft'
  return 'unit'
}

function measurementLocal(item) {
  const { pricing_mode, length, length_unit, width, width_unit, total_length_or_quantity } = item
  if (pricing_mode === 'sq_inch' || pricing_mode === 'sq_feet') {
    const areaLabel = pricing_mode === 'sq_inch' ? 'sq in' : 'sq ft'
    if (length && width) return `${length}${length_unit} x ${width}${width_unit} (${total_length_or_quantity} ${areaLabel})`
    return `${total_length_or_quantity} ${areaLabel}`
  }
  return `${total_length_or_quantity} units`
}

function formatRsLocal(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return 'Rs. -'
  return `Rs. ${Number(value).toLocaleString('en-LK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

function baseStyles() {
  return `
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 4px; }
    .header h1 { font-size: 18px; margin: 0; }
    .header .sub { font-size: 11px; color: #555; margin-top: 2px; }
    .meta { text-align: right; font-size: 10px; color: #777; }
    .category-title { font-size: 13px; font-weight: bold; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #111; text-transform: uppercase; letter-spacing: 0.02em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th, td { border: 1px solid #ccc; padding: 5px 7px; font-size: 10.5px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; }
    .right { text-align: right; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 20px; font-size: 9.5px; color: #999; text-align: center; }
    @media print { .category-block { break-inside: avoid; } }
  `
}

function openPrintWindow(title, headerHtml, bodyHtml) {
  const printWindow = window.open('', '_blank', 'width=900,height=1000')
  if (!printWindow) {
    alert('Please allow pop-ups for this site to print the item list.')
    return
  }
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${baseStyles()}</style>
</head>
<body>
  ${headerHtml}
  ${bodyHtml}
  <div class="footer">Tricast Price Comparison System</div>
</body>
</html>`
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 300)
}

function rowHtml(idx, name, variant, deptName, totalPrice, measurement, unitPrice, suffix) {
  return `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(variant || '-')}</td>
      <td>${escapeHtml(deptName || '-')}</td>
      <td class="right">${formatRsLocal(totalPrice)}</td>
      <td>${escapeHtml(measurement)}</td>
      <td class="right"><strong>${formatRsLocal(unitPrice, 2)}</strong> / ${suffix}</td>
    </tr>`
}

function tableHtml(rows) {
  return `
    <table>
      <thead>
        <tr>
          <th style="width:26px;">#</th>
          <th>Item</th>
          <th>Variant / Size</th>
          <th>Department</th>
          <th class="right">Total Price</th>
          <th>Qty / Dimensions</th>
          <th class="right">Unit Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

/**
 * Full A4 printout of EVERY item this vendor has a price for, grouped by
 * category (A-Z), items A-Z within each category. `items` is the flat list
 * from getSupplierProducts (SupplierProductDetailOut shape - has nested
 * `product` with category_name and department_id). `departmentsById` maps
 * department id -> display name, since ProductOut only carries the id.
 */
export function printVendorItemList(vendorName, items, departmentsById = {}) {
  const grouped = {}
  items.forEach((item) => {
    const catName = item.product.category_name || 'Uncategorized'
    if (!grouped[catName]) grouped[catName] = []
    grouped[catName].push(item)
  })

  const categoryNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b))
  categoryNames.forEach((cat) => grouped[cat].sort((a, b) => a.product.name.localeCompare(b.product.name)))

  const printedAt = new Date().toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  const sections = categoryNames
    .map((cat) => {
      const rows = grouped[cat]
        .map((item, idx) =>
          rowHtml(
            idx,
            item.product.name,
            item.product.variant_code_or_size,
            departmentsById[item.product.department_id],
            item.total_price,
            measurementLocal(item),
            item.unit_price,
            unitSuffixLocal(item.pricing_mode)
          )
        )
        .join('')
      return `<div class="category-block"><div class="category-title">${escapeHtml(cat)}</div>${tableHtml(rows)}</div>`
    })
    .join('')

  const headerHtml = `
    <div class="header">
      <div><h1>${escapeHtml(vendorName)}</h1><div class="sub">Item Price List</div></div>
      <div class="meta">Printed: ${escapeHtml(printedAt)}</div>
    </div>`

  openPrintWindow(
    `${vendorName} - Item Price List`,
    headerHtml,
    sections || '<p>No priced items for this vendor.</p>'
  )
}

/**
 * A4 printout of just ONE category's items for a vendor (used from the
 * Items-within-category screen). `items` is SupplierCategoryItemOut shape
 * - flat, already carries department_name directly.
 */
export function printVendorCategoryItemList(vendorName, categoryName, items) {
  const sorted = [...items].sort((a, b) => a.product_name.localeCompare(b.product_name))

  const printedAt = new Date().toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  const rows = sorted
    .map((item, idx) =>
      rowHtml(
        idx,
        item.product_name,
        item.variant_code_or_size,
        item.department_name,
        item.total_price,
        measurementLocal(item),
        item.unit_price,
        unitSuffixLocal(item.pricing_mode)
      )
    )
    .join('')

  const headerHtml = `
    <div class="header">
      <div><h1>${escapeHtml(vendorName)}</h1><div class="sub">${escapeHtml(categoryName)}</div></div>
      <div class="meta">Printed: ${escapeHtml(printedAt)}</div>
    </div>`

  openPrintWindow(
    `${vendorName} - ${categoryName}`,
    headerHtml,
    `<div class="category-block">${tableHtml(rows)}</div>`
  )
}