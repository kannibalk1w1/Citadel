import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { useMascotStore } from '../store/mascotStore'
import { useUIStore } from '../store/uiStore'

function scaledCanvas(source: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  if (scale <= 1) return source
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(source.width * scale))
  out.height = Math.max(1, Math.round(source.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, out.width, out.height)
  return out
}

export async function exportToPdf(filename = 'citadel-export.pdf'): Promise<void> {
  const mascot = useMascotStore.getState()
  mascot.triggerEffect('progress-fill', 0)

  const canvasEl = document.querySelector('canvas') as HTMLCanvasElement
  if (!canvasEl) throw new Error('No canvas to export')

  mascot.triggerEffect('progress-fill', 0.5)

  const exportCanvas = scaledCanvas(canvasEl, useUIStore.getState().exportScale)
  const dataUrl = exportCanvas.toDataURL('image/png')
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
