// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const getDocument = vi.hoisted(() => vi.fn())

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument,
}))

import { renderPdfFirstPage } from './pdfPreview'

function response(): Response {
  return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } as Response
}

function canvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({} as CanvasRenderingContext2D)),
    toDataURL: vi.fn(() => 'data:image/png;base64,preview'),
  } as unknown as HTMLCanvasElement
}

function task(renderPromise: Promise<void> = Promise.resolve()) {
  const page = {
    getViewport: vi.fn(() => ({ width: 200, height: 100 })),
    render: vi.fn(() => ({ promise: renderPromise })),
  }
  const documentProxy = { getPage: vi.fn().mockResolvedValue(page) }
  const loadingTask = {
    promise: Promise.resolve(documentProxy),
    destroy: vi.fn().mockResolvedValue(undefined),
  }
  return { loadingTask, page }
}

describe('renderPdfFirstPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    getDocument.mockReset()
  })

  it('renders a local PDF and destroys the PDF.js loading task', async () => {
    const pdfTask = task()
    getDocument.mockReturnValue(pdfTask.loadingTask)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()))
    vi.spyOn(document, 'createElement').mockReturnValue(canvas())

    await expect(renderPdfFirstPage('/archive/brief.pdf')).resolves.toEqual({
      imageData: 'data:image/png;base64,preview',
      width: 200,
      height: 100,
    })
    expect(getDocument).toHaveBeenCalledWith({ data: expect.any(Uint8Array) })
    expect(pdfTask.loadingTask.destroy).toHaveBeenCalledOnce()
  })

  it('destroys the loading task when rendering fails', async () => {
    const pdfTask = task(Promise.reject(new Error('render failed')))
    getDocument.mockReturnValue(pdfTask.loadingTask)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()))
    vi.spyOn(document, 'createElement').mockReturnValue(canvas())

    await expect(renderPdfFirstPage('/archive/brief.pdf')).rejects.toThrow('render failed')
    expect(pdfTask.loadingTask.destroy).toHaveBeenCalledOnce()
  })

  it('refuses URL sources before fetching or creating a PDF task', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    await expect(renderPdfFirstPage('https://example.com/brief.pdf'))
      .rejects.toThrow('Citadel previews local PDF files only')
    expect(fetch).not.toHaveBeenCalled()
    expect(getDocument).not.toHaveBeenCalled()
  })
})
