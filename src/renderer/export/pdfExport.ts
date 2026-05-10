import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { useMascotStore } from '../store/mascotStore'

export async function exportToPdf(filename = 'citadel-export.pdf'): Promise<void> {
  const mascot = useMascotStore.getState()
  mascot.triggerEffect('progress-fill', 0)

  const canvasEl = document.querySelector('canvas') as HTMLCanvasElement
  if (!canvasEl) throw new Error('No canvas to export')

  mascot.triggerEffect('progress-fill', 0.5)

  const dataUrl = canvasEl.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: canvasEl.width > canvasEl.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvasEl.width, canvasEl.height],
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, canvasEl.width, canvasEl.height)

  mascot.triggerEffect('progress-fill', 1)

  const pdfData = pdf.output('datauristring')
  await window.ipc.invoke('export:pdf', { imageData: pdfData, filename })
  mascot.triggerEffect('lightning-out')
}
