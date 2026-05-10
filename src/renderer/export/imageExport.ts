import { useMascotStore } from '../store/mascotStore'

type ImageFormat = 'png' | 'jpg' | 'webp'

export async function exportToImage(filename = 'citadel-export.png', format: ImageFormat = 'png', quality = 0.95): Promise<void> {
  const mascot = useMascotStore.getState()
  mascot.triggerEffect('progress-fill', 0)

  const canvasEl = document.querySelector('canvas') as HTMLCanvasElement
  if (!canvasEl) throw new Error('No canvas to export')

  const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  const imageData = canvasEl.toDataURL(mimeType, quality)

  mascot.triggerEffect('progress-fill', 0.8)

  await window.ipc.invoke('export:image', { imageData, filename, format, quality })
  mascot.triggerEffect('lightning-out')
}
