// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentExtractionResult } from '../../types/documents'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useInscriptionToastStore } from '../ui/toasts/inscriptionToastStore'
import { useFileDrop } from './useFileDrop'

// The PDF branch pulls in pdfjs, which this file never exercises.
vi.mock('../utils/pdfPreview', () => ({ renderPdfFirstPage: vi.fn() }))

const invoke = vi.fn()

type DroppedFile = { name: string; path: string }

/** Only the parts of a drop event `handleDrop` actually reads. */
function dropEvent(files: DroppedFile[]): Parameters<ReturnType<typeof useFileDrop>['handleDrop']>[0] {
  return {
    preventDefault: vi.fn(),
    clientX: 400,
    clientY: 300,
    dataTransfer: { files },
  } as unknown as Parameters<ReturnType<typeof useFileDrop>['handleDrop']>[0]
}

function extraction(overrides: Partial<Extract<DocumentExtractionResult, { ok: true }>> = {}): DocumentExtractionResult {
  return {
    ok: true,
    format: 'docx',
    sourcePath: '/home/scribe/brief.docx',
    sourceName: 'brief.docx',
    text: 'A dropped document',
    characters: 18,
    words: 3,
    truncated: false,
    ...overrides,
  }
}

function toastTexts(): string[] {
  return useInscriptionToastStore.getState().toasts.map((toast) => toast.text)
}

describe('useFileDrop with Word documents', () => {
  beforeEach(() => {
    invoke.mockReset()
    Object.defineProperty(window, 'ipc', { value: { invoke }, configurable: true, writable: true })
    useCanvasStore.setState({
      boards: [{ id: 'board-1', name: 'Board', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
      activeBoardId: 'board-1',
      selectedIds: [],
    })
    useHistoryStore.setState({ events: [], cursor: -1 })
    useInscriptionToastStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds an editable, selected text item from a dropped .docx', async () => {
    invoke.mockResolvedValue(extraction())
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'brief.docx', path: '/home/scribe/brief.docx' }]))

    expect(invoke).toHaveBeenCalledWith('document:extractText', { path: '/home/scribe/brief.docx' })

    const items = useCanvasStore.getState().items()
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('text')
    expect(items[0].meta?.content).toBe('A dropped document')
    expect(items[0].src).toBe('/home/scribe/brief.docx')
    expect(items[0].locked).toBe(false)

    // Selected on arrival, which is what puts resize handles on it immediately.
    expect(useCanvasStore.getState().selectedIds).toEqual([items[0].id])
    expect(toastTexts()).toEqual(['brief.docx imported as text'])
  })

  it('records one undoable, replayable event for the import', async () => {
    invoke.mockResolvedValue(extraction())
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'brief.docx', path: '/home/scribe/brief.docx' }]))

    const events = useHistoryStore.getState().events
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'ITEM_ADD', boardId: 'board-1', before: null })
    expect((events[0].after as { type: string }).type).toBe('text')
    expect(useHistoryStore.getState().canUndo()).toBe(true)
  })

  it('refuses a legacy .doc in the interface without asking the main process', async () => {
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'memo.doc', path: '/home/scribe/memo.doc' }]))

    expect(invoke).not.toHaveBeenCalled()
    expect(useCanvasStore.getState().items()).toHaveLength(0)
    const toasts = useInscriptionToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].tone).toBe('danger')
    expect(toasts[0].text).toContain('memo.doc')
    expect(toasts[0].text).toContain('save as .docx')
  })

  it('says why a damaged document was dropped instead of adding nothing', async () => {
    invoke.mockResolvedValue({ ok: false, code: 'unreadable', reason: 'damaged' })
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'damaged.docx', path: '/home/scribe/damaged.docx' }]))

    expect(useCanvasStore.getState().items()).toHaveLength(0)
    expect(useHistoryStore.getState().events).toHaveLength(0)
    const toasts = useInscriptionToastStore.getState().toasts
    expect(toasts[0].tone).toBe('danger')
    expect(toasts[0].text).toContain('could not be read as a Word document')
  })

  it('survives a failed bridge call', async () => {
    invoke.mockRejectedValue(new Error('bridge is gone'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'brief.docx', path: '/home/scribe/brief.docx' }]))

    expect(useCanvasStore.getState().items()).toHaveLength(0)
    expect(useInscriptionToastStore.getState().toasts[0].tone).toBe('danger')
  })

  it('keeps going when one document in a batch fails', async () => {
    invoke
      .mockResolvedValueOnce({ ok: false, code: 'empty', reason: 'no text' })
      .mockResolvedValueOnce(extraction({ sourcePath: '/home/scribe/second.docx', sourceName: 'second.docx' }))
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([
      { name: 'blank.docx', path: '/home/scribe/blank.docx' },
      { name: 'second.docx', path: '/home/scribe/second.docx' },
    ]))

    const items = useCanvasStore.getState().items()
    expect(items).toHaveLength(1)
    expect(items[0].src).toBe('/home/scribe/second.docx')
    expect(useCanvasStore.getState().selectedIds).toEqual([items[0].id])
    expect(toastTexts()).toContain('blank.docx has no text to import.')
  })

  it('imports a dropped .md through the same bridge and flow', async () => {
    invoke.mockResolvedValue(extraction({
      format: 'markdown',
      sourcePath: '/home/scribe/outline.md',
      sourceName: 'outline.md',
      text: '# Outline\n\n- first',
    }))
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'outline.md', path: '/home/scribe/outline.md' }]))

    expect(invoke).toHaveBeenCalledWith('document:extractText', { path: '/home/scribe/outline.md' })
    const items = useCanvasStore.getState().items()
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('text')
    expect(items[0].meta?.content).toBe('# Outline\n\n- first')
    expect(items[0].meta?.documentFormat).toBe('markdown')
    expect(useCanvasStore.getState().selectedIds).toEqual([items[0].id])
    expect(useHistoryStore.getState().events).toHaveLength(1)
    expect(toastTexts()[0]).toContain('does not render Markdown')
  })

  it('imports a dropped .txt the same way', async () => {
    invoke.mockResolvedValue(extraction({
      format: 'text',
      sourcePath: '/home/scribe/log.txt',
      sourceName: 'log.txt',
      text: 'plain notes',
    }))
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'log.txt', path: '/home/scribe/log.txt' }]))

    const items = useCanvasStore.getState().items()
    expect(items).toHaveLength(1)
    expect(items[0].meta?.documentFormat).toBe('text')
    expect(items[0].src).toBe('/home/scribe/log.txt')
    expect(toastTexts()).toEqual(['log.txt imported as text'])
  })

  it('leaves formats it does not import to the rest of the drop flow', async () => {
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'sheet.xlsx', path: '/home/scribe/sheet.xlsx' }]))

    expect(invoke).not.toHaveBeenCalled()
    expect(useCanvasStore.getState().items()).toHaveLength(0)
    expect(useInscriptionToastStore.getState().toasts).toHaveLength(0)
  })

  it('tells the person when a long document was shortened', async () => {
    invoke.mockResolvedValue(extraction({ truncated: true, characters: 500_000 }))
    const { result } = renderHook(() => useFileDrop())

    await result.current.handleDrop(dropEvent([{ name: 'brief.docx', path: '/home/scribe/brief.docx' }]))

    expect(useCanvasStore.getState().items()[0].meta?.documentTruncated).toBe(true)
    expect(toastTexts()[0]).toContain('shortened to fit')
  })
})
