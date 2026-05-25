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
  Stage: React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(function Stage({ children }, ref) {
    return <div ref={ref} data-testid="konva-stage">{children}</div>
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
vi.mock('../arcade/HyperTypeEngine', () => ({ engine: { burst: vi.fn() } }))
vi.mock('../arcade/dragonCursor', () => ({
  DS_NORMAL: 'default',
  DS_CROSS: 'crosshair',
  DS_HAND: 'pointer',
  DS_WHIP: 'crosshair',
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
    dragonCursorEnabled: false,
    presentationMode: false,
    searchHighlightId: null,
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
  })
})
