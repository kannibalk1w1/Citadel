import * as pdfjs from 'pdfjs-dist'
import { isLocalSourcePath, pathToUrl } from './pathToUrl'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export async function renderPdfFirstPage(pdfPath: string): Promise<{ imageData: string; width: number; height: number }> {
  // Refused before the fetch, not after: pathToUrl passes an address straight
  // through, so a PDF item carrying one would otherwise be fetched from the
  // network to draw its preview. Citadel previews local files only.
  if (!isLocalSourcePath(pdfPath)) throw new Error('Citadel previews local PDF files only')
  const response = await fetch(pathToUrl(pdfPath))
  if (!response.ok) throw new Error(`Failed to read PDF: ${response.status}`)
  const data = new Uint8Array(await response.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  try {
    const page = await doc.getPage(1)
    const baseViewport = page.getViewport({ scale: 1 })
    const maxSide = 1400
    const scale = Math.min(2, maxSide / Math.max(baseViewport.width, baseViewport.height))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    return {
      imageData: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    }
  } finally {
    await doc.destroy()
  }
}
