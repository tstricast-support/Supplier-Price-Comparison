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
    .print-controls {
      position: sticky; top: 0; z-index: 50;
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 10px 14px; background: #f3f4f6; border-bottom: 1px solid #ddd;
    }
    .print-controls button {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px; font-weight: 600;
      padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer;
    }
    .print-controls .btn-print { background: #2563eb; color: #fff; }
    .print-controls .btn-close { background: #fff; color: #374151; border: 1px solid #d1d5db; }
    .page-content { padding: 0 12mm; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 8px; margin: 14mm 0 4px; }
    .header h1 { font-size: 18px; margin: 0; }
    .header .sub { font-size: 11px; color: #555; margin-top: 2px; }
    .meta { text-align: right; font-size: 10px; color: #777; }
    .category-title { font-size: 13px; font-weight: bold; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #111; text-transform: uppercase; letter-spacing: 0.02em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th, td { border: 1px solid #ccc; padding: 5px 7px; font-size: 10.5px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; }
    .right { text-align: right; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .footer { margin: 20px 0; font-size: 9.5px; color: #999; text-align: center; }
    @media print {
      .print-controls { display: none !important; }
      .page-content { padding: 0; }
      .header { margin-top: 0; }
      @page { size: A4; margin: 14mm 12mm; }
    }
    @media print { .category-block { break-inside: avoid; } }
  `
}

/**
 * Opens (or reuses) a print window, fills it with the printable page, and
 * gives the user a visible on-screen "Close" button - iOS Safari doesn't
 * put any close/X control on windows opened via window.open(), so without
 * this the page is unreachable to dismiss on iPhone. The button is hidden
 * automatically when actually printing (@media print).
 *
 * `existingWindow`: pass a window reference that was already opened
 * SYNCHRONOUSLY inside the click handler (before any await) so iOS
 * Safari's popup blocker doesn't discard it once async work finishes.
 */
function openPrintWindow(title, headerHtml, bodyHtml, existingWindow) {
  const printWindow = existingWindow || window.open('', '_blank', 'width=900,height=1000')
  if (!printWindow) {
    alert('Please allow pop-ups for this site to print the item list.')
    return
  }
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${baseStyles()}</style>
</head>
<body>
  <div class="print-controls">
    <button class="btn-print" onclick="window.print()">Print</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>
  <div class="page-content">
    ${headerHtml}
    ${bodyHtml}
    <div class="footer">Tricast Price Comparison System</div>
  </div>
</body>
</html>`
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
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
 * category (A-Z), items A-Z within each category.
 *
 * `existingWindow`: optional, pass a window already opened synchronously
 * in the caller's click handler (needed for the async "print all" flow so
 * iOS Safari doesn't block the popup - see SupplierView.jsx).
 */
export function printVendorItemList(vendorName, items, departmentsById = {}, existingWindow) {
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
    sections || '<p>No priced items for this vendor.</p>',
    existingWindow
  )
}

/**
 * A4 printout of just ONE category's items for a vendor.
 */
export function printVendorCategoryItemList(vendorName, categoryName, items, existingWindow) {
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
    `<div class="category-block">${tableHtml(rows)}</div>`,
    existingWindow
  )
}