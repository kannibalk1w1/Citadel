import { useMascotStore } from '../store/mascotStore'
import { useUIStore } from '../store/uiStore'

type ImageFormat = 'png' | 'jpg' | 'webp'

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

export async function exportToImage(filename = 'citadel-export.png', format: ImageFormat = 'png', quality = 0.95): Promise<void> {
  const mascot = useMascotStore.getState()
  mascot.triggerEffect('progress-fill', 0)

  const canvasEl = document.querySelector('canvas') as HTMLCanvasElement
  if (!canvasEl) throw new Error('No canvas to export')

  const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  const exportCanvas = scaledCanvas(canvasEl, useUIStore.getState().exportScale)
  const imageData = exportCanvas.toDataURL(mimeType, quality)

  mascot.triggerEffect('progress-fill', 0.8)

  await window.ipc.invoke('export:image', { imageData, filename, format, quality })
  mascot.triggerEffect('lightning-out')
}
