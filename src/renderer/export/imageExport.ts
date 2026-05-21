import { useMascotStore } from '../store/mascotStore'
import { prepareExportCanvas } from './exportCanvas'

type ImageFormat = 'png' | 'jpg' | 'webp'

export async function exportToImage(filename = 'citadel-export.png', format: ImageFormat = 'png', quality = 0.95): Promise<void> {
  const mascot = useMascotStore.getState()
  mascot.triggerEffect('progress-fill', 0)

  const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  const { canvas: exportCanvas } = await prepareExportCanvas()
  const imageData = exportCanvas.toDataURL(mimeType, quality)

  mascot.triggerEffect('progress-fill', 0.8)

  await window.ipc.invoke('export:image', { imageData, filename, format, quality })
  mascot.triggerEffect('lightning-out')
}
