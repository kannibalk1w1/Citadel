import { pathToUrl } from './pathToUrl'

export async function copyImageDataUrl(imageData: string): Promise<boolean> {
  const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
  const result = await ipc.invoke('clipboard:writeImageDataUrl', { imageData }) as { ok?: boolean }
  return result.ok === true
}

export async function imageSrcToPngDataUrl(src: string): Promise<string> {
  const img = new Image()
  img.decoding = 'async'
  img.src = pathToUrl(src)
  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, img.naturalWidth)
  canvas.height = Math.max(1, img.naturalHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/png')
}

export async function copyImageSrcToClipboard(src: string): Promise<boolean> {
  const imageData = await imageSrcToPngDataUrl(src)
  return copyImageDataUrl(imageData)
}
