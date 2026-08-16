import { jsPDF } from 'jspdf'
import { prepareExportCanvas } from './exportCanvas'

export async function exportToPdf(filename = 'citadel-export.pdf'): Promise<void> {
  const { canvas: exportCanvas, width, height } = await prepareExportCanvas()
  const dataUrl = exportCanvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)

  const pdfData = pdf.output('datauristring')
  await window.ipc.invoke('export:pdf', { imageData: pdfData, filename })
}
