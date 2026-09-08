import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy, TextContent } from 'pdfjs-dist/types/src/display/api'
import { isLocalSourcePath, pathToUrl } from './pathToUrl'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()

export const PDF_LIMITS = { bytes: 64 * 1024 * 1024, pages: 500, pageCharacters: 100_000, characters: 2_000_000, results: 100, query: 200, milliseconds: 30_000 } as const
export type PdfPreview = { imageData: string; width: number; height: number; numPages: number }
export type PdfSearchResult = { page: number; snippet: string }
export type PdfSearch = { results: PdfSearchResult[]; pagesSearched: number; numPages: number; truncated: boolean; hasText: boolean }

export function pdfAbortError(): Error { return new DOMException('PDF operation cancelled', 'AbortError') }
export function checkPdfAbort(signal?: AbortSignal): void { if (signal?.aborted) throw signal.reason ?? pdfAbortError() }

async function readBytes(path: string, signal: AbortSignal): Promise<Uint8Array> {
  // A project may contain hostile paths. Neither URLs nor network shares are
  // accepted, and PDF.js receives bytes rather than a URL to follow itself.
  if (!isLocalSourcePath(path) || /^[\\/]{2}/.test(path)) throw new Error('Citadel previews local PDF files only')
  const response = await fetch(pathToUrl(path), { signal })
  if (!response.ok) throw new Error(`Failed to read PDF: ${response.status}`)
  const reader = response.body?.getReader()
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length > PDF_LIMITS.bytes) throw new Error('PDF exceeds the 64 MB reading limit')
    return bytes
  }
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      checkPdfAbort(signal)
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > PDF_LIMITS.bytes) throw new Error('PDF exceeds the 64 MB reading limit')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}

/** No persistent document/text cache: the loading task owns its worker and all
 * page resources, and is destroyed on completion, cancellation and failure. */
async function withPdf<T>(path: string, signal: AbortSignal | undefined, work: (doc: PDFDocumentProxy, signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason ?? pdfAbortError())
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  const timeout = setTimeout(() => controller.abort(new Error('PDF operation exceeded the 30 second limit')), PDF_LIMITS.milliseconds)
  let loadingTask: ReturnType<typeof pdfjs.getDocument> | undefined
  let destruction: Promise<void> | undefined
  const destroy = () => { if (loadingTask) destruction ??= loadingTask.destroy(); return destruction }
  const destroyOnAbort = () => { void destroy()?.catch(() => {}) }
  controller.signal.addEventListener('abort', destroyOnAbort, { once: true })
  try {
    checkPdfAbort(controller.signal)
    const data = await readBytes(path, controller.signal)
    checkPdfAbort(controller.signal)
    loadingTask = pdfjs.getDocument({ data, useWorkerFetch: false })
    const doc = await loadingTask.promise
    checkPdfAbort(controller.signal)
    return await work(doc, controller.signal)
  } catch (error) {
    checkPdfAbort(controller.signal)
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
    controller.signal.removeEventListener('abort', destroyOnAbort)
    await destroy()
  }
}

export function readPdfInfo(path: string, signal?: AbortSignal): Promise<{ numPages: number }> {
  return withPdf(path, signal, async (doc) => ({ numPages: doc.numPages }))
}

export function renderPdfPage(path: string, pageNumber: number, signal?: AbortSignal): Promise<PdfPreview> {
  return withPdf(path, signal, async (doc, operationSignal) => {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > doc.numPages) throw new Error('PDF page number is out of range')
    const page = await doc.getPage(pageNumber)
    const canvas = document.createElement('canvas')
    try {
      checkPdfAbort(operationSignal)
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = Math.min(2, 1400 / Math.max(baseViewport.width, baseViewport.height))
      const viewport = page.getViewport({ scale })
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const renderTask = page.render({ canvas, canvasContext: ctx, viewport })
      const cancel = () => renderTask.cancel()
      operationSignal.addEventListener('abort', cancel, { once: true })
      try {
        await renderTask.promise
        checkPdfAbort(operationSignal)
        return { imageData: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height, numPages: doc.numPages }
      } finally { operationSignal.removeEventListener('abort', cancel) }
    } finally {
      canvas.width = canvas.height = 0
      page.cleanup()
    }
  })
}

export function renderPdfFirstPage(path: string, signal?: AbortSignal): Promise<PdfPreview> {
  return renderPdfPage(path, 1, signal)
}

export function searchPdfText(path: string, query: string, signal?: AbortSignal): Promise<PdfSearch> {
  const needle = query.trim().slice(0, PDF_LIMITS.query).replace(/\s+/g, ' ').toLocaleLowerCase()
  return withPdf(path, signal, async (doc, operationSignal) => {
    const result: PdfSearch = { results: [], pagesSearched: 0, numPages: doc.numPages, truncated: false, hasText: false }
    if (!needle) return result
    let characters = 0
    const pageLimit = Math.min(doc.numPages, PDF_LIMITS.pages)
    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
      checkPdfAbort(operationSignal)
      const page = await doc.getPage(pageNumber)
      const reader = page.streamTextContent().getReader() as ReadableStreamDefaultReader<TextContent>
      const cancel = () => { void reader.cancel().catch(() => {}) }
      operationSignal.addEventListener('abort', cancel, { once: true })
      let text = ''
      let pageTruncated = false
      try {
        while (true) {
          checkPdfAbort(operationSignal)
          const { done, value } = await reader.read()
          if (done) break
          for (const item of value.items) {
            if (!('str' in item)) continue
            const available = Math.min(PDF_LIMITS.pageCharacters - text.length, PDF_LIMITS.characters - characters)
            // PDF.js emits spaces itself; adjacent style runs can split a word.
            // Only a real line boundary needs an additional separator.
            const extracted = `${item.str}${item.hasEOL ? ' ' : ''}`
            const part = extracted.slice(0, available)
            text += part
            characters += part.length
            if (part.length < extracted.length) { result.truncated = true; pageTruncated = true; break }
          }
          if (text.length >= PDF_LIMITS.pageCharacters || characters >= PDF_LIMITS.characters || pageTruncated) { result.truncated = true; break }
        }
      } finally {
        operationSignal.removeEventListener('abort', cancel)
        await reader.cancel().catch(() => {})
        reader.releaseLock()
        page.cleanup()
      }
      checkPdfAbort(operationSignal)
      text = text.replace(/\s+/g, ' ').trim()
      result.hasText ||= text.length > 0
      result.pagesSearched = pageNumber
      const lower = text.toLocaleLowerCase()
      let position = lower.indexOf(needle)
      while (position !== -1 && result.results.length < PDF_LIMITS.results) {
        const start = Math.max(0, position - 55)
        const end = Math.min(text.length, position + needle.length + 80)
        result.results.push({ page: pageNumber, snippet: `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}` })
        position = lower.indexOf(needle, position + needle.length)
      }
      if (result.results.length >= PDF_LIMITS.results || characters >= PDF_LIMITS.characters) {
        result.truncated = true
        break
      }
      // Yield between pages so input/cancel stays responsive even on cached PDFs.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    result.truncated ||= result.pagesSearched < doc.numPages
    return result
  })
}
