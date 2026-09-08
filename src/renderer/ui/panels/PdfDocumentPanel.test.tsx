// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { beginProjectSession } from '../../utils/projectSession'

vi.mock('../../utils/pdfPreview', () => ({
  PDF_LIMITS: { query: 200 }, readPdfInfo: vi.fn(), searchPdfText: vi.fn(), renderPdfPage: vi.fn(),
  pdfAbortError: () => new DOMException('Cancelled', 'AbortError'),
  checkPdfAbort: (signal: AbortSignal) => { if (signal.aborted) throw signal.reason },
}))
import { readPdfInfo, searchPdfText, renderPdfPage } from '../../utils/pdfPreview'
import { PdfDocumentPanel } from './PdfDocumentPanel'

const item: CanvasItem = { id: 'pdf', type: 'image', x: 10, y: 20, width: 600, height: 300, rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [], src: '/cache/page1.png', meta: { sourcePdf: '/archive/report.pdf', sourcePdfPage: 1 } }
function Panel() {
  const item = useCanvasStore((state) => state.boards[0]?.items[0])
  return item ? <PdfDocumentPanel item={item} boardId="board" /> : null
}
function current() { return useCanvasStore.getState().items()[0] }
async function opened() { await waitFor(() => expect((screen.getByRole('button', { name: 'Next PDF page' }) as HTMLButtonElement).disabled).toBe(false)) }

beforeEach(() => {
  beginProjectSession()
  vi.mocked(readPdfInfo).mockReset().mockResolvedValue({ numPages: 3 })
  vi.mocked(renderPdfPage).mockReset().mockResolvedValue({ imageData: 'data:page', width: 600, height: 300, numPages: 3 })
  vi.mocked(searchPdfText).mockReset().mockResolvedValue({ results: [{ page: 3, snippet: 'A matching research phrase' }], pagesSearched: 3, numPages: 3, hasText: true, truncated: false })
  Object.defineProperty(window, 'ipc', { value: { invoke: vi.fn(async () => ({ path: '/cache/new-page.png' })) }, configurable: true })
  useCanvasStore.setState({ boards: [{ id: 'board', name: 'Board', items: [{ ...item }], connections: [], viewport: { x: 0, y: 0, scale: 1 } }], activeBoardId: 'board', selectedIds: ['pdf'] })
  useHistoryStore.getState().resetHistory()
})
afterEach(cleanup)

describe('PDF document panel', () => {
  it('navigates next, previous and a page number with undoable events', async () => {
    render(<Panel />)
    await opened()
    expect((screen.getByRole('button', { name: 'Previous PDF page' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Next PDF page' }))
    await waitFor(() => expect(current().meta?.sourcePdfPage).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Previous PDF page' }))
    await waitFor(() => expect(current().meta?.sourcePdfPage).toBe(1))
    fireEvent.change(screen.getByLabelText('Page'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    await waitFor(() => expect(current().meta?.sourcePdfPage).toBe(3))
    expect(useHistoryStore.getState().events.map((event) => event.type)).toEqual(['ITEM_STYLE', 'ITEM_STYLE', 'ITEM_STYLE'])
    expect((screen.getByRole('button', { name: 'Next PDF page' }) as HTMLButtonElement).disabled).toBe(true)
    expect(readPdfInfo).toHaveBeenCalledTimes(1)
  })

  it('searches text and follows a page/snippet result', async () => {
    render(<Panel />); await opened()
    fireEvent.change(screen.getByLabelText('Search PDF text'), { target: { value: 'research' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search PDF' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Page 3: A matching research phrase' }))
    await waitFor(() => expect(current().meta?.sourcePdfPage).toBe(3))
    expect(searchPdfText).toHaveBeenCalledWith('/archive/report.pdf', 'research', expect.any(AbortSignal))
    expect(screen.getByRole('list', { name: 'PDF search results' })).toBeTruthy()
  })

  it('cancels a search when the query changes and ignores its late results', async () => {
    let complete!: (value: Awaited<ReturnType<typeof searchPdfText>>) => void
    vi.mocked(searchPdfText).mockReturnValue(new Promise((resolve) => { complete = resolve }))
    render(<Panel />); await opened()
    fireEvent.change(screen.getByLabelText('Search PDF text'), { target: { value: 'old' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search PDF' }))
    const signal = vi.mocked(searchPdfText).mock.calls[0][2]!
    fireEvent.change(screen.getByLabelText('Search PDF text'), { target: { value: 'new' } })
    expect(signal.aborted).toBe(true)
    await act(async () => complete({ results: [{ page: 3, snippet: 'stale' }], pagesSearched: 3, numPages: 3, hasText: true, truncated: false }))
    expect(screen.queryByRole('list', { name: 'PDF search results' })).toBeNull()
  })

  it('cancels active work when the panel unmounts', async () => {
    vi.mocked(searchPdfText).mockReturnValue(new Promise(() => {}))
    const view = render(<Panel />); await opened()
    fireEvent.change(screen.getByLabelText('Search PDF text'), { target: { value: 'research' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search PDF' }))
    const signal = vi.mocked(searchPdfText).mock.calls[0][2]!
    view.unmount()
    expect(signal.aborted).toBe(true)
  })

  it('reports scanned pages and a partial search', async () => {
    vi.mocked(searchPdfText).mockResolvedValue({ results: [], pagesSearched: 500, numPages: 501, hasText: false, truncated: true })
    render(<Panel />); await opened()
    fireEvent.change(screen.getByLabelText('Search PDF text'), { target: { value: 'research' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search PDF' }))
    expect(await screen.findByText(/No searchable text found/)).toBeTruthy()
    expect(screen.getByText(/results may be incomplete/)).toBeTruthy()
  })

  it.each([['Password required', 'password protected'], ['Failed to read PDF: 404', 'source file is still available']])('explains %s', async (reason, message) => {
    vi.mocked(readPdfInfo).mockRejectedValue(new Error(reason))
    render(<Panel />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(message))
    expect(useHistoryStore.getState().events).toHaveLength(0)
  })

  it('reopens a PDF after cancelling the initial read and ignores late page counts', async () => {
    let complete!: (value: { numPages: number }) => void
    vi.mocked(readPdfInfo).mockReturnValueOnce(new Promise((resolve) => { complete = resolve }))
    render(<Panel />)
    fireEvent.change(screen.getByLabelText('Search PDF text'), { target: { value: 'draft' } })
    const signal = vi.mocked(readPdfInfo).mock.calls[0][1]!
    expect(signal.aborted).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(signal.aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Open PDF' }))
    await opened()
    await act(async () => complete({ numPages: 999 }))
    expect(screen.getByText('of 3')).toBeTruthy()
    expect(screen.queryByText('of 999')).toBeNull()
  })

  it('renders nothing for ordinary images', () => {
    const view = render(<PdfDocumentPanel item={{ ...item, meta: {} }} boardId="board" />)
    expect(view.container.childElementCount).toBe(0)
  })
})
