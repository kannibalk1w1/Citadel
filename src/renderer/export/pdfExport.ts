import { jsPDF } from 'jspdf'
import { useMascotStore } from '../store/mascotStore'
import { prepareExportCanvas } from './exportCanvas'

export async function exportToPdf(filename = 'citadel-export.pdf'): Promise<void> {
  const mascot = useMascotStore.getState()
  mascot.triggerEffect('progress-fill', 0)

  mascot.triggerEffect('progress-fill', 0.5)

  const { canvas: exportCanvas, width, height } = await prepareExportCanvas()
  const dataUrl = exportCanvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)

  mascot.triggerEffect('progress-fill', 1)

  const pdfData = pdf.output('datauristring')
  await window.ipc.invoke('export:pdf', { imageData: pdfData, filename })
  mascot.triggerEffect('lightning-out')
}
