import { prepareExportCanvas } from './exportCanvas'

type ImageFormat = 'png' | 'jpg' | 'webp'

export async function exportToImage(filename = 'citadel-export.png', format: ImageFormat = 'png', quality = 0.95): Promise<void> {
  const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  const { canvas: exportCanvas } = await prepareExportCanvas()
  const imageData = exportCanvas.toDataURL(mimeType, quality)

  await window.ipc.invoke('export:image', { imageData, filename, format, quality })
}
