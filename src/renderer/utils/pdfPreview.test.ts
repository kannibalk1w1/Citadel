// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const getDocument = vi.hoisted(() => vi.fn())
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: { workerSrc: '' }, getDocument }))
import { PDF_LIMITS, readPdfInfo, renderPdfFirstPage, renderPdfPage, searchPdfText } from './pdfPreview'

function setup(texts = ['First page', 'Research target on second page', 'Last page']) {
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => ({})), toDataURL: vi.fn(() => 'data:image/png;base64,preview') }
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }))
  const pages = texts.map((text) => ({
    getViewport: vi.fn(() => ({ width: 200, height: 100 })),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
    cleanup: vi.fn(),
    streamTextContent: vi.fn(() => new ReadableStream({ start(controller) { controller.enqueue({ items: [{ str: text }] }); controller.close() } })),
  }))
  const doc = { numPages: texts.length, getPage: vi.fn(async (number: number) => pages[number - 1]) }
  const loadingTask = { promise: Promise.resolve(doc), destroy: vi.fn().mockResolvedValue(undefined) }
  getDocument.mockReturnValue(loadingTask)
  return { canvas, pages, doc, loadingTask }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); getDocument.mockReset() })

describe('local PDF operations', () => {
  it('keeps the first-page import API and cleans all raster resources', async () => {
    const { doc, loadingTask, pages, canvas } = setup()
    await expect(renderPdfFirstPage('/archive/brief.pdf')).resolves.toEqual({ imageData: 'data:image/png;base64,preview', width: 200, height: 100, numPages: 3 })
    expect(doc.getPage).toHaveBeenCalledWith(1)
    expect(getDocument).toHaveBeenCalledWith({ data: expect.any(Uint8Array), useWorkerFetch: false })
    expect(loadingTask.destroy).toHaveBeenCalledOnce()
    expect(pages[0].cleanup).toHaveBeenCalledOnce()
    expect(canvas.width).toBe(0)
  })

  it('renders only the requested page and refuses out-of-range pages', async () => {
    const { doc } = setup()
    await renderPdfPage('/archive/brief.pdf', 2)
    expect(doc.getPage).toHaveBeenCalledWith(2)
    await expect(renderPdfPage('/archive/brief.pdf', 4)).rejects.toThrow('out of range')
    await expect(renderPdfPage('/archive/brief.pdf', 1.5)).rejects.toThrow('out of range')
    expect(doc.getPage).toHaveBeenCalledTimes(1)
  })

  it('reads page count without rasterizing pages', async () => {
    const { doc, loadingTask } = setup()
    await expect(readPdfInfo('/archive/brief.pdf')).resolves.toEqual({ numPages: 3 })
    expect(doc.getPage).not.toHaveBeenCalled()
    expect(loadingTask.destroy).toHaveBeenCalledOnce()
  })

  it('releases the worker on parsing and rendering failures', async () => {
    const { pages, loadingTask } = setup()
    pages[0].render.mockImplementation(() => ({ promise: Promise.reject(new Error('render failed')), cancel: vi.fn() }))
    await expect(renderPdfFirstPage('/archive/brief.pdf')).rejects.toThrow('render failed')
    expect(loadingTask.destroy).toHaveBeenCalledOnce()
    loadingTask.promise = Promise.reject(new Error('Password required'))
    await expect(readPdfInfo('/archive/brief.pdf')).rejects.toThrow('Password required')
    expect(loadingTask.destroy).toHaveBeenCalledTimes(2)
  })

  it.each(['https://example.com/brief.pdf', 'file:///tmp/a.pdf', '//server/share/a.pdf', '\\\\server\\share\\a.pdf'])('refuses %s without fetching', async (path) => {
    setup()
    await expect(renderPdfFirstPage(path)).rejects.toThrow('local PDF files only')
    expect(fetch).not.toHaveBeenCalled()
    expect(getDocument).not.toHaveBeenCalled()
  })

  it('refuses missing and oversized PDFs', async () => {
    setup()
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    await expect(readPdfInfo('/missing.pdf')).rejects.toThrow('404')
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(PDF_LIMITS.bytes + 1)) } }) } as Response)
    await expect(readPdfInfo('/large.pdf')).rejects.toThrow('64 MB')
    expect(getDocument).not.toHaveBeenCalled()
  })

  it('cancels pending rendering and destroys the worker once', async () => {
    const { pages, loadingTask } = setup()
    const cancel = vi.fn()
    let reject!: (reason: unknown) => void
    pages[1].render.mockImplementation(() => ({ promise: new Promise((_resolve, fail) => { reject = fail }), cancel }))
    const controller = new AbortController()
    const promise = renderPdfPage('/archive/brief.pdf', 2, controller.signal)
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(pages[1].render).toHaveBeenCalled())
    controller.abort()
    reject(new Error('render cancelled'))
    await assertion
    expect(cancel).toHaveBeenCalledOnce()
    expect(loadingTask.destroy).toHaveBeenCalledOnce()
  })

  it('refuses already cancelled requests before reading', async () => {
    setup()
    const controller = new AbortController(); controller.abort()
    await expect(readPdfInfo('/archive/brief.pdf', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('bounded PDF text search', () => {
  it('joins style-split words and preserves explicit spaces and line boundaries', async () => {
    const { pages } = setup([''])
    pages[0].streamTextContent.mockImplementation(() => new ReadableStream({ start(controller) {
      controller.enqueue({ items: [{ str: 're' }, { str: 'search', hasEOL: true }, { str: 'needle' }] })
      controller.close()
    } }))
    const result = await searchPdfText('/archive/brief.pdf', 'research  needle')
    expect(result.results).toEqual([{ page: 1, snippet: 'research needle' }])
  })

  it('finds page/snippet matches with no page rasters and destroys the worker', async () => {
    const { pages, loadingTask } = setup()
    const result = await searchPdfText('/archive/brief.pdf', 'TARGET')
    expect(result).toMatchObject({ results: [{ page: 2, snippet: 'Research target on second page' }], pagesSearched: 3, numPages: 3, hasText: true, truncated: false })
    for (const page of pages) { expect(page.render).not.toHaveBeenCalled(); expect(page.cleanup).toHaveBeenCalledOnce() }
    expect(loadingTask.destroy).toHaveBeenCalledOnce()
  })

  it('reports scanned pages without searchable text', async () => {
    setup(['', ''])
    await expect(searchPdfText('/scanned.pdf', 'target')).resolves.toMatchObject({ results: [], hasText: false, truncated: false })
  })

  it('caps results and reports partial searches', async () => {
    const { doc } = setup(['target '.repeat(150), 'target'])
    const result = await searchPdfText('/archive/brief.pdf', 'target')
    expect(result.results).toHaveLength(PDF_LIMITS.results)
    expect(result.truncated).toBe(true)
    expect(doc.getPage).toHaveBeenCalledTimes(1)
  })

  it('caps text per page and still searches later pages', async () => {
    setup(['x'.repeat(PDF_LIMITS.pageCharacters + 100), 'target'])
    const result = await searchPdfText('/archive/brief.pdf', 'target')
    expect(result.results).toEqual([{ page: 2, snippet: 'target' }])
    expect(result.truncated).toBe(true)
  })

  it('stops after the page budget and labels the result incomplete', async () => {
    const { doc } = setup(Array.from({ length: PDF_LIMITS.pages + 1 }, () => 'reference'))
    const result = await searchPdfText('/archive/brief.pdf', 'absent')
    expect(result.pagesSearched).toBe(PDF_LIMITS.pages)
    expect(result.truncated).toBe(true)
    expect(doc.getPage).toHaveBeenCalledTimes(PDF_LIMITS.pages)
  })

  it('stops extracting after the document character budget', async () => {
    const { doc } = setup(Array.from({ length: 30 }, () => 'x'.repeat(PDF_LIMITS.pageCharacters)))
    const result = await searchPdfText('/archive/brief.pdf', 'absent')
    expect(result.pagesSearched).toBe(PDF_LIMITS.characters / PDF_LIMITS.pageCharacters)
    expect(result.truncated).toBe(true)
    expect(doc.getPage).toHaveBeenCalledTimes(20)
  })

  it('times out stalled text extraction and releases its worker', async () => {
    const { pages, loadingTask } = setup()
    pages[0].streamTextContent.mockImplementation(() => new ReadableStream())
    vi.useFakeTimers()
    const promise = searchPdfText('/archive/brief.pdf', 'target')
    const assertion = expect(promise).rejects.toThrow('30 second limit')
    await vi.advanceTimersByTimeAsync(PDF_LIMITS.milliseconds)
    await assertion
    expect(loadingTask.destroy).toHaveBeenCalledOnce()
  })

  it('cancels a text stream in progress and never opens the next page', async () => {
    const { pages, doc, loadingTask } = setup()
    const cancel = vi.fn()
    pages[0].streamTextContent.mockImplementation(() => new ReadableStream({ cancel }))
    const controller = new AbortController()
    const promise = searchPdfText('/archive/brief.pdf', 'target', controller.signal)
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(pages[0].streamTextContent).toHaveBeenCalled())
    controller.abort()
    await assertion
    expect(cancel).toHaveBeenCalledOnce()
    expect(doc.getPage).toHaveBeenCalledTimes(1)
    expect(loadingTask.destroy).toHaveBeenCalledOnce()
  })
})
