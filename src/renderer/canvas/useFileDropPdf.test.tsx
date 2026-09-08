// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { beginProjectSession } from '../utils/projectSession'
vi.mock('../utils/pdfPreview', () => ({ renderPdfFirstPage: vi.fn() }))
import { renderPdfFirstPage } from '../utils/pdfPreview'
import { useFileDrop } from './useFileDrop'

const preview = { width: 400, height: 200, imageData: 'data:preview', numPages: 3 }
const invoke = vi.fn()
const drop = { preventDefault: vi.fn(), clientX: 400, clientY: 300, dataTransfer: { files: [{ name: 'research.pdf', path: '/source/research.pdf' }] } } as unknown as Parameters<ReturnType<typeof useFileDrop>['handleDrop']>[0]

beforeEach(() => {
  beginProjectSession()
  useCanvasStore.setState({ boards: [{ id: 'board', name: 'Board', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } }], activeBoardId: 'board', selectedIds: [] })
  useHistoryStore.getState().resetHistory()
  vi.mocked(renderPdfFirstPage).mockReset().mockResolvedValue(preview)
  invoke.mockReset().mockImplementation(async (channel) => channel === 'assets:getThumbnail' ? { exists: true, size: 50, mtimeMs: 2 } : { path: '/cache/page1.png' })
  Object.defineProperty(window, 'ipc', { value: { invoke }, configurable: true })
})

describe('PDF drop', () => {
  it('keeps the image format and source metadata with the page count', async () => {
    const { result } = renderHook(useFileDrop)
    await act(() => result.current.handleDrop(drop))
    const item = useCanvasStore.getState().items()[0]
    expect(item).toMatchObject({ type: 'image', src: '/cache/page1.png', width: 400, height: 200, meta: { sourcePdf: '/source/research.pdf', sourcePdfPage: 1, sourcePdfPages: 3, sourceFingerprint: { size: 50, mtimeMs: 2 } } })
    expect(useCanvasStore.getState().selectedIds).toEqual([item.id])
    expect(useHistoryStore.getState().events[0]).toMatchObject({ type: 'ITEM_ADD', after: item })
    expect(renderPdfFirstPage).toHaveBeenCalledWith('/source/research.pdf', expect.any(AbortSignal))
  })

  it('does not add an old PDF to a replacement project with reused board IDs', async () => {
    let resolve!: (value: typeof preview) => void
    vi.mocked(renderPdfFirstPage).mockReturnValue(new Promise((done) => { resolve = done }))
    const { result } = renderHook(useFileDrop)
    let pending!: Promise<void>
    await act(async () => { pending = result.current.handleDrop(drop); await Promise.resolve() })
    await vi.waitFor(() => expect(renderPdfFirstPage).toHaveBeenCalled())
    await act(async () => {
      beginProjectSession()
      useCanvasStore.setState({ selectedIds: ['new-selection'] })
      resolve(preview)
      await pending
    })
    expect(useCanvasStore.getState().items()).toHaveLength(0)
    expect(useCanvasStore.getState().selectedIds).toEqual(['new-selection'])
    expect(useHistoryStore.getState().events).toHaveLength(0)
    expect(invoke.mock.calls.filter(([channel]) => channel === 'pdf:cachePageImage')).toHaveLength(0)
  })
})
