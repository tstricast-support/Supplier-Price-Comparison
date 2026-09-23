/**
 * Renders a saved Purchase Order as the printable template and opens the
 * browser print dialog, where "Save as PDF" / "Print to PDF" produces the
 * downloadable file. Same approach (and same iOS popup workaround) as
 * printVendorList.js.
 *
 * `existingWindow`: a window opened SYNCHRONOUSLY inside the click handler
 * before any await, so iOS Safari's popup blocker doesn't discard it.
 */

function esc(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function money(value) {
  if (value === null || value === undefined || isNaN(value)) return '0.00'
  return Number(value).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

function multiline(text) {
  if (!text) return ''
  return esc(text)
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => `<div>${l}</div>`)
    .join('')
}

export function styles(accent) {
  return `
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; background: #fff; }
    .print-controls {
      position: sticky; top: 0; z-index: 50;
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 10px 14px; background: #f3f4f6; border-bottom: 1px solid #ddd;
    }
    .print-controls button {
      font-family: inherit; font-size: 13px; font-weight: 600;
      padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer;
    }
    .print-controls .btn-print { background: ${accent}; color: #fff; }
    .print-controls .btn-close { background: #fff; color: #374151; border: 1px solid #d1d5db; }

    .sheet { max-width: 800px; margin: 0 auto; padding: 6mm 10mm 0; }

    .masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
    .logo-text { font-size: 34px; font-weight: 800; letter-spacing: 0.5px; color: ${accent}; line-height: 1.05; }
    .logo-img { max-height: 60px; max-width: 260px; object-fit: contain; }
    .doc-title { font-size: 26px; font-weight: 400; color: #6b7280; letter-spacing: 1px; white-space: nowrap; }

    .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
    .company div { font-size: 11px; line-height: 1.75; color: #374151; }
    .meta { min-width: 210px; }
    .meta table { width: 100%; border-collapse: collapse; }
    .meta th { font-size: 9px; letter-spacing: 0.6px; color: ${accent}; text-align: center; padding: 5px 4px 2px; font-weight: 700; }
    .meta td { font-size: 11px; text-align: center; padding: 0 4px 5px; border-bottom: 1px solid #d1d5db; }

    .parties { display: flex; gap: 40px; margin-bottom: 14px; }
    .party { flex: 1; }
    .party .label { font-size: 9px; font-weight: 700; letter-spacing: 0.6px; color: ${accent}; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin-bottom: 6px; }
    .party div { font-size: 11px; line-height: 1.7; color: #374151; }

    table.grid { width: 100%; border-collapse: collapse; }
    table.grid th { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; color: ${accent}; text-align: center; padding: 5px 6px; border-bottom: 1px solid #d1d5db; }
    table.grid td { font-size: 10.5px; padding: 5px 8px; border: 1px solid #e5e7eb; height: 22px; }

    .shipping-grid { display: flex; width: 100%; }
    .shipping-col { flex: 1 1 20%; min-width: 0; box-sizing: border-box; }
    .shipping-th {
      font-size: 9px; font-weight: 700; letter-spacing: 0.5px; color: ${accent};
      padding: 5px 6px; border-bottom: 1px solid #d1d5db; box-sizing: border-box;
      min-height: 24px; display: flex; align-items: center; justify-content: center;
    }
    .shipping-td {
      font-size: 10.5px; padding: 5px 8px; border: 1px solid #e5e7eb; box-sizing: border-box;
      min-height: 22px; display: flex; align-items: center; justify-content: center;
    }

    .items-grid { width: 100%; margin-top: 18px; }
    .items-head, .items-row { display: flex; }
    .items-head > div {
      font-size: 9px; font-weight: 700; letter-spacing: 0.5px; color: ${accent};
      padding: 5px 6px; border-bottom: 1px solid #d1d5db; box-sizing: border-box;
      min-height: 24px; display: flex; align-items: center;
    }
    .items-row > div {
      font-size: 10.5px; padding: 5px 8px; border: 1px solid #e5e7eb; box-sizing: border-box;
      min-height: 22px; display: flex; align-items: center;
    }
    .items-row { break-inside: avoid; }
    .col-itemno { flex: 0 0 110px; justify-content: center; }
    .col-desc { flex: 1 1 auto; min-width: 0; justify-content: flex-start; }
    .col-qty { flex: 0 0 70px; justify-content: center; }
    .col-price { flex: 0 0 110px; justify-content: flex-end; }
    .col-total { flex: 0 0 120px; justify-content: flex-end; }

    .bottom { display: flex; justify-content: space-between; gap: 30px; margin-top: 14px; }
    .remarks { flex: 1; font-size: 10.5px; color: #4b5563; line-height: 1.6; }
    .totals { width: 320px; }
    .totals table { width: 100%; border-collapse: collapse; }
    .totals td { font-size: 10.5px; padding: 4px 8px; }
    .totals .lbl { text-align: right; font-weight: 700; color: ${accent}; }
    .totals .hint { font-weight: 400; color: #9ca3af; font-size: 9px; }
    .totals .val { text-align: right; width: 120px; border-bottom: 1px solid #e5e7eb; }
    .totals .grand td { font-size: 12.5px; font-weight: 700; }
    .totals .grand .val { background: #e5e7eb; border-bottom: none; }

    .payto { font-size: 10.5px; font-style: italic; color: #4b5563; margin-top: 16px; }
    .thanks { font-size: 20px; color: #374151; margin-top: 4px; letter-spacing: 0.5px; }
    .foot { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #6b7280; line-height: 1.7; }
    .foot .q { font-style: italic; }

    @media print {
      .print-controls { display: none !important; }
      .sheet { padding: 0; max-width: none; }
    }
  `
}

export function buildBody(po) {
  const accent = po.logo_color || '#4b5563'
  const lines = po.lines || []
  const MIN_ROWS = 8
  const blanks = Math.max(0, MIN_ROWS - lines.length)

  const logoHtml = po.logo_url
    ? `<img class="logo-img" src="${esc(po.logo_url)}" alt="${esc(po.logo_text || po.company_name)}" />`
    : `<div class="logo-text">${esc(po.logo_text || po.company_name)}</div>`

  // The ITEM NO. field is never removed from the data model - it's only
  // shown on the printed PO when the "Show Item No." checkbox was ticked
  // on the form (po.show_item_no). Off by default.
  const showItemNo = !!po.show_item_no
   const itemRows = lines
    .map(
      (l) => `
        <div class="items-row">
          ${showItemNo ? `<div class="col-itemno">${esc(l.item_no || '')}</div>` : ''}
          <div class="col-desc">${esc(l.description)}</div>
          <div class="col-qty">${esc(l.qty)}</div>
          <div class="col-price">${money(l.unit_price)}</div>
          <div class="col-total">${money(l.line_total)}</div>
        </div>`
    )
    .join('')

  const blankRows = Array.from({ length: blanks })
    .map(
      () => `
        <div class="items-row">
          ${showItemNo ? '<div class="col-itemno">&nbsp;</div>' : ''}
          <div class="col-desc"></div>
          <div class="col-qty"></div>
          <div class="col-price"></div>
          <div class="col-total">0.00</div>
        </div>`
    )
    .join('')

  return `
    <div class="sheet">
      <div class="masthead">
        ${logoHtml}
        <div class="doc-title">PURCHASE ORDER</div>
      </div>

      <div class="top">
        <div class="company">
          <div><strong>${esc(po.company_name)}</strong></div>
          ${po.company_address_line1 ? `<div>${esc(po.company_address_line1)}</div>` : ''}
          ${po.company_address_line2 ? `<div>${esc(po.company_address_line2)}</div>` : ''}
          ${po.company_phone ? `<div>${esc(po.company_phone)}</div>` : ''}
          ${po.company_email ? `<div>${esc(po.company_email)}</div>` : ''}
          ${po.company_contact ? `<div>${esc(po.company_contact)}</div>` : ''}
        </div>

        <div class="meta">
          <table>
            <tr><th>DATE</th></tr>
            <tr><td>${formatDate(po.po_date)}</td></tr>
            <tr><th>PURCHASE ORDER NO.</th></tr>
            <tr><td>${esc(po.po_number)}</td></tr>
            <tr><th>CUSTOMER NO.</th></tr>
            <tr><td>${esc(po.customer_no || '—')}</td></tr>
          </table>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="label">VENDOR</div>
          <div><strong>${esc(po.vendor_name || '—')}</strong></div>
          ${multiline(po.vendor_address)}
        </div>
        <div class="party">
          <div class="label">BILL TO</div>
          ${multiline(po.bill_to) || '<div>&nbsp;</div>'}
        </div>
      </div>

      <div class="parties" style="margin-top:-6px">
        <div class="party">
          <div class="label">SHIP TO</div>
          ${multiline(po.ship_to) || '<div>&nbsp;</div>'}
        </div>
        <div class="party"></div>
      </div>

      <div class="shipping-grid">
        <div class="shipping-col">
          <div class="shipping-th">SHIPPING METHOD</div>
          <div class="shipping-td">${esc(po.shipping_method || '')}</div>
        </div>
        <div class="shipping-col">
          <div class="shipping-th">SHIPPING TERMS</div>
          <div class="shipping-td">${esc(po.shipping_terms || '')}</div>
        </div>
        <div class="shipping-col">
          <div class="shipping-th">SHIP VIA</div>
          <div class="shipping-td">${esc(po.ship_via || '')}</div>
        </div>
        <div class="shipping-col">
          <div class="shipping-th">PAYMENT</div>
          <div class="shipping-td">${esc(po.payment_terms || '')}</div>
        </div>
        <div class="shipping-col">
          <div class="shipping-th">DELIVERY DATE</div>
          <div class="shipping-td">${esc(po.delivery_date || '')}</div>
        </div>
      </div>

      <div class="items-grid">
        <div class="items-head">
          ${showItemNo ? `<div class="col-itemno">ITEM NO.</div>` : ''}
          <div class="col-desc">DESCRIPTION</div>
          <div class="col-qty">QTY</div>
          <div class="col-price">UNIT PRICE</div>
          <div class="col-total">TOTAL</div>
        </div>
        ${itemRows}
        ${blankRows}
      </div>

      <div class="bottom">
        <div class="remarks">
          <div style="color:#6b7280">Remarks / Instructions:</div>
          ${multiline(po.remarks)}
        </div>

        <div class="totals">
          <table>
            <tr><td class="lbl">SUBTOTAL</td><td class="val">${money(po.subtotal)}</td></tr>
            <tr><td class="lbl"><span class="hint">enter total amount</span> DISCOUNT</td><td class="val">${money(po.discount)}</td></tr>
            <tr><td class="lbl">SUBTOTAL LESS DISCOUNT</td><td class="val">${money(po.subtotal_less_discount)}</td></tr>
            <tr><td class="lbl"><span class="hint">enter percentage</span> TAX RATE</td><td class="val">${Number(po.tax_rate || 0).toFixed(3)}%</td></tr>
            <tr><td class="lbl">TOTAL TAX</td><td class="val">${money(po.total_tax)}</td></tr>
            <tr><td class="lbl">SHIPPING/HANDLING</td><td class="val">${money(po.shipping_handling)}</td></tr>
            <tr><td class="lbl">OTHER</td><td class="val">${money(po.other)}</td></tr>
            <tr class="grand"><td class="lbl">TOTAL</td><td class="val">Rs. ${money(po.total)}</td></tr>
          </table>
        </div>
      </div>

      <div class="payto">Please reference PO ${esc(po.po_number)} on your invoice and delivery note.</div>
      <div class="thanks">THANK YOU</div>

      <div class="foot">
        <div class="q">For questions concerning this purchase order, please contact</div>
        <div>${esc(po.company_contact || 'Point of Contact')}${po.company_phone ? `, ${esc(po.company_phone)}` : ''}${po.company_email ? `, ${esc(po.company_email)}` : ''}</div>
        ${po.company_website ? `<div>${esc(po.company_website)}</div>` : ''}
      </div>
    </div>
  `
}

export function printPurchaseOrder(po, existingWindow) {
  const win = existingWindow || window.open('', '_blank')
  if (!win) {
    alert('Allow pop-ups for this site to download the purchase order.')
    return
  }

  const accent = po.logo_color || '#4b5563'
  const fileName = `${po.po_number}`

  win.document.open()
  win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${window.location.origin}/" />
    <title>${esc(fileName)}</title>
    <style>${styles(accent)}</style>
  </head>
  <body>
    <div class="print-controls">
      <button class="btn-print" onclick="window.print()">Save as PDF</button>
      <button class="btn-close" onclick="window.close()">Close</button>
    </div>
    ${buildBody(po)}
  </body>
</html>`)
  win.document.close()
  win.focus()

  // Wait for the logo image (if any) to actually finish loading before
  // opening the print dialog - a fixed timeout risks printing a blank spot
  // where the logo should be on a slow connection.
  const triggerPrint = () => {
    try {
      win.print()
    } catch {
      /* user can still press "Save as PDF" */
    }
  }

  const img = win.document.querySelector('.logo-img')
  if (img && !img.complete) {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setTimeout(triggerPrint, 150)
    }
    img.addEventListener('load', finish)
    img.addEventListener('error', finish)
    // Safety net in case neither event fires.
    setTimeout(finish, 2000)
  } else {
    setTimeout(triggerPrint, 300)
  }
}

export default printPurchaseOrder