// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { createLargeBoardFixture } from '../performance/largeBoardFixture'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { CanvasStage } from './CanvasStage'

vi.mock('react-konva', () => ({
  // The ref stands in for a Konva.Stage, not a DOM node: overlays attach
  // namespaced Konva listeners to it, so a bare <div> ref would throw.
  Stage: React.forwardRef<unknown, { children: React.ReactNode }>(function Stage({ children }, ref) {
    React.useImperativeHandle(ref, () => ({
      on: () => {},
      off: () => {},
      getPointerPosition: () => ({ x: 0, y: 0 }),
    }))
    return <div data-testid="konva-stage">{children}</div>
  }),
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
}))

vi.mock('./ItemRenderer', () => ({
  ItemRenderer: ({ item }: { item: CanvasItem }) => <div data-testid="canvas-stage-item" data-item-id={item.id} />,
  DOMLayerItemRenderer: ({ item }: { item: CanvasItem }) => <div data-testid="canvas-stage-dom-item" data-item-id={item.id} />,
  isDOMLayerItem: (item: CanvasItem) => ['video', 'youtube', 'audio', 'model3d'].includes(item.type),
}))

vi.mock('./CanvasBackground', () => ({ CanvasBackground: () => <div data-testid="canvas-background" /> }))
vi.mock('./useFileDrop', () => ({ useFileDrop: () => ({ handleDragOver: vi.fn(), handleDrop: vi.fn() }) }))
vi.mock('./overlays/ConnectionLayer', () => ({ ConnectionLayer: () => null }))
vi.mock('./overlays/GroupLayer', () => ({ GroupLayer: () => null }))
vi.mock('./overlays/SnapGuides', () => ({ SnapGuides: () => null }))
vi.mock('./overlays/SelectionBox', () => ({
  SelectionBox: ({ items }: { items?: CanvasItem[] }) => (
    <div data-testid="canvas-stage-selection-box" data-item-ids={(items ?? []).map((item) => item.id).join(',')} />
  ),
}))
vi.mock('./overlays/SelectedActionStrip', () => ({ SelectedActionStrip: () => null }))
vi.mock('./overlays/SearchHighlight', () => ({ SearchHighlight: () => null }))
vi.mock('./overlays/LassoOverlay', () => ({ LassoOverlay: () => null }))
vi.mock('./overlays/AnchorHandles', () => ({ AnchorHandles: () => null }))
vi.mock('./overlays/ConnectorQuickToolbar', () => ({ ConnectorQuickToolbar: () => null }))
vi.mock('./overlays/KonvaItemChrome', () => ({
  KonvaItemChrome: ({ items }: { items?: CanvasItem[] }) => (
    <>
      {(items ?? []).map((item) => <div key={item.id} data-testid="canvas-stage-chrome" data-item-id={item.id} />)}
    </>
  ),
}))
vi.mock('./overlays/RuntimeStatsSigil', () => ({
  RuntimeStatsSigil: ({ stats }: { stats: { totalRelics: number; mountedRelics: number; awakeDOMMedia: number; sleepingAnimatedRelics: number } }) => (
    <div
      data-testid="runtime-stats-sigil"
      data-total-relics={stats.totalRelics}
      data-mounted-relics={stats.mountedRelics}
      data-awake-dom-media={stats.awakeDOMMedia}
      data-sleeping-animated-relics={stats.sleepingAnimatedRelics}
    />
  ),
}))

beforeEach(() => {
  Object.assign(window, {
    innerWidth: 704,
    innerHeight: 280,
  })

  const fixture = createLargeBoardFixture({ itemCount: 1000, columns: 50 })
  const mediaItems: CanvasItem[] = [
    {
      id: 'fixture-video-near',
      type: 'video',
      x: 40,
      y: 40,
      width: 240,
      height: 160,
      rotation: 0,
      zIndex: 1001,
      locked: false,
      visible: true,
      opacity: 1,
      tags: ['media'],
      src: 'C:/media/near.mp4',
    },
    {
      id: 'fixture-audio-selected',
      type: 'audio',
      x: 9000,
      y: 9000,
      width: 280,
      height: 120,
      rotation: 0,
      zIndex: 1002,
      locked: false,
      visible: true,
      opacity: 1,
      tags: ['media'],
      src: 'C:/media/selected.mp3',
    },
    {
      id: 'fixture-model-offscreen',
      type: 'model3d',
      x: 9400,
      y: 9400,
      width: 320,
      height: 320,
      rotation: 0,
      zIndex: 1003,
      locked: false,
      visible: true,
      opacity: 1,
      tags: ['media'],
      src: 'C:/media/offscreen.glb',
    },
  ]
  useCanvasStore.setState({
    boards: [{ ...fixture.board, items: [...fixture.board.items, ...mediaItems] }],
    activeBoardId: fixture.board.id,
    selectedIds: ['fixture-relic-0999', 'fixture-audio-selected'],
  })
  useUIStore.setState({
    toolMode: 'select',
    connectFromId: null,
    presentationMode: false,
    searchHighlightId: null,
    boardLoadVisible: true,
  })
})

afterEach(() => cleanup())

describe('CanvasStage viewport rendering', () => {
  it('renders a viewport-sized slice of a large chamber while keeping selected offscreen items mounted', () => {
    render(<CanvasStage />)

    const renderedIds = screen.getAllByTestId('canvas-stage-item').map((element) => element.dataset.itemId)
    const chromeIds = screen.getAllByTestId('canvas-stage-chrome').map((element) => element.dataset.itemId)
    const selectionIds = screen.getByTestId('canvas-stage-selection-box').dataset.itemIds?.split(',')
    const domIds = screen.getAllByTestId('canvas-stage-dom-item').map((element) => element.dataset.itemId)
    const stats = screen.getByTestId('runtime-stats-sigil').dataset

    expect(renderedIds.length).toBeLessThan(80)
    expect(renderedIds).toContain('fixture-relic-0000')
    expect(renderedIds).toContain('fixture-relic-0999')
    expect(renderedIds).toContain('fixture-video-near')
    expect(renderedIds).toContain('fixture-audio-selected')
    expect(renderedIds).not.toContain('fixture-relic-0900')
    expect(renderedIds).not.toContain('fixture-model-offscreen')
    expect(chromeIds).toEqual(renderedIds)
    expect(selectionIds).toEqual(renderedIds)
    expect(domIds).toEqual(['fixture-video-near', 'fixture-audio-selected'])
    expect(stats.totalRelics).toBe('1003')
    expect(stats.mountedRelics).toBe(String(renderedIds.length))
    expect(stats.awakeDomMedia).toBe('2')
    expect(stats.sleepingAnimatedRelics).toBe('1')
  })
})

describe('the board load readout', () => {
  it('is shown while it is turned on', () => {
    render(<CanvasStage />)

    expect(screen.queryByTestId('runtime-stats-sigil')).toBeTruthy()
  })

  it('disappears from the canvas once it is turned off', () => {
    useUIStore.setState({ boardLoadVisible: false })

    render(<CanvasStage />)

    expect(screen.queryByTestId('runtime-stats-sigil')).toBeNull()
    // The rest of the canvas is untouched — this hides a readout, not content.
    expect(screen.getAllByTestId('canvas-stage-item').length).toBeGreaterThan(0)
  })
})
