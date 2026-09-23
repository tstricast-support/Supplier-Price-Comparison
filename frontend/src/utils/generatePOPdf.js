import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { buildBody, styles } from './printPurchaseOrder'

export async function generatePOPdfBlob(po) {
  const accent = po.logo_color || '#4b5563'

  const container = document.createElement('div')
  // Kept ON-screen at (0,0) but invisible - pushing it off-canvas (e.g.
  // left: -10000px) confuses html2canvas's capture-region math and it
  // silently crops the top of the document. opacity:0 + negative z-index
  // hides it from the person without moving it out of the viewport.
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.zIndex = '-9999'
  container.style.pointerEvents = 'none'
  container.style.width = '794px' // ~A4 width at 96dpi
  container.style.margin = '0'
  container.style.background = '#fff'
  container.innerHTML = `<style>${styles(accent)}</style>${buildBody(po)}`
  document.body.appendChild(container)

  try {
    const img = container.querySelector('.logo-img')
    if (img && !img.complete) {
      await new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
        setTimeout(resolve, 2000)
      })
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
    })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = (canvas.height * pageWidth) / canvas.width

        const overflowRatio = imgHeight / pageHeight

    if (overflowRatio <= 1.05) {
      // Only marginally over one page (a few mm) - shrink slightly to fit
      // entirely on page 1 instead of spilling a near-empty, artifact-prone
      // page 2 that cuts the footer mid-line.
      const fitHeight = pageHeight
      const fitWidth = (canvas.width * fitHeight) / canvas.height
      const xOffset = Math.max(0, (pageWidth - fitWidth) / 2)
      pdf.addImage(imgData, 'PNG', xOffset, 0, Math.min(fitWidth, pageWidth), fitHeight)
    } else if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight)
    } else {
      let remaining = imgHeight
      let position = 0
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
        remaining -= pageHeight
        position -= pageHeight
        if (remaining > 0) pdf.addPage()
      }
    }

    return pdf.output('blob')
  } finally {
    document.body.removeChild(container)
  }
}