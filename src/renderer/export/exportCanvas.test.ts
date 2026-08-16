// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { itemsForFittedExport, prepareExportCanvas, stagePixelRatio } from './exportCanvas'

const baseItem: CanvasItem = {
  id: 'item-1',
  type: 'image',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
}

describe('exportCanvas', () => {
  it('uses selected items for fitted selection export', () => {
    const items = [
      { ...baseItem, id: 'image-1' },
      { ...baseItem, id: 'image-2' },
      { ...baseItem, id: 'comment-1', type: 'sticky', meta: { kind: 'comment' } },
    ] satisfies CanvasItem[]

    expect(itemsForFittedExport(items, 'selection', ['image-2', 'comment-1'], false).map((item) => item.id)).toEqual(['image-2'])
  })

  it('returns no fitted items for selection export without a selection', () => {
    expect(itemsForFittedExport([{ ...baseItem, id: 'image-1' }], 'selection', [], true)).toEqual([])
  })

  describe('stagePixelRatio', () => {
    it('reports the ratio between the backing store and the css box', () => {
      expect(stagePixelRatio({ width: 1600, clientWidth: 800 })).toBe(2)
      expect(stagePixelRatio({ width: 800, clientWidth: 800 })).toBe(1)
    })

    it('falls back to 1 when the element has not been laid out', () => {
      expect(stagePixelRatio({ width: 800, clientWidth: 0 })).toBe(1)
    })
  })
})

/**
 * Code cards render into the DOM overlay, which the stage capture cannot see.
 * These prove the export path repaints them rather than silently dropping them,
 * and that boards without code cards take the untouched path they always did.
 */
describe('code cards in a captured export', () => {
  const contexts: { canvas: HTMLCanvasElement; calls: { op: string; args: unknown[] }[] }[] = []

  function fakeContext(canvas: HTMLCanvasElement) {
    const calls: { op: string; args: unknown[] }[] = []
    const state: Record<string, unknown> = {}
    contexts.push({ canvas, calls })
    return new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'measureText') return (text: string) => ({ width: text.length * 7 })
        if (prop === 'canvas') return canvas
        if (prop in state) return state[prop]
        return (...args: unknown[]) => { calls.push({ op: prop, args }) }
      },
      set(_t, prop: string, value) { state[prop] = value; return true },
    }) as unknown as CanvasRenderingContext2D
  }

  function drawnText(): string[] {
    return contexts.flatMap((c) => c.calls.filter((call) => call.op === 'fillText').map((call) => String(call.args[0])))
  }

  function setBoard(items: CanvasItem[]): void {
    useCanvasStore.setState({
      boards: [{ id: 'board-1', name: 'Board', items, connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
      activeBoardId: 'board-1',
      selectedIds: [],
    })
    useUIStore.setState({ exportArea: 'viewport', exportScale: 1, includeCommentsInExport: true, commentPinsVisible: true })
  }

  beforeEach(() => {
    contexts.length = 0
    document.body.innerHTML = '<canvas></canvas>'
    const stage = document.querySelector('canvas') as HTMLCanvasElement
    stage.width = 800
    stage.height = 600
    Object.defineProperty(stage, 'clientWidth', { value: 800, configurable: true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return fakeContext(this)
    } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const codeCard: CanvasItem = {
    id: 'code-1', type: 'code', x: 10, y: 10, width: 400, height: 300,
    rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
    meta: { language: 'python', code: "def main():\n    return 'citadel'" },
  }

  const imageCard: CanvasItem = {
    id: 'image-1', type: 'image', x: 0, y: 0, width: 100, height: 100,
    rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [], src: 'a.png',
  }

  it('paints the card header, language and code into the export', async () => {
    setBoard([imageCard, codeCard])

    await prepareExportCanvas()
    const text = drawnText()

    expect(text).toContain('PYTHON')
    expect(text).toContain('def')
    expect(text.join(' ')).toContain('citadel')
  })

  // The capture is the live Konva canvas at scale 1. Painting straight onto it
  // would leave the card smeared across the board the user is still looking at.
  it('never draws onto the live stage canvas', async () => {
    setBoard([codeCard])
    const stage = document.querySelector('canvas') as HTMLCanvasElement

    const result = await prepareExportCanvas()

    expect(result.canvas).not.toBe(stage)
    expect(contexts.filter((c) => c.canvas === stage && c.calls.some((call) => call.op === 'fillText'))).toEqual([])
  })

  it('leaves a board with no code cards on the untouched capture path', async () => {
    setBoard([imageCard])
    const stage = document.querySelector('canvas') as HTMLCanvasElement

    const result = await prepareExportCanvas()

    expect(result.canvas).toBe(stage)
    expect(drawnText()).toEqual([])
  })

  it('keeps reporting the stage size so PDF page geometry is unchanged', async () => {
    setBoard([codeCard])

    const result = await prepareExportCanvas()

    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
  })

  it('skips a hidden code card', async () => {
    setBoard([{ ...codeCard, visible: false }])

    await prepareExportCanvas()

    expect(drawnText()).toEqual([])
  })
})
