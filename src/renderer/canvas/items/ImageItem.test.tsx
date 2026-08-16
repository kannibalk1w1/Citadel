// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { clearAssetMetadataForTest, recordAssetMetadata } from '../../assets/assetMetadata'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { useSourceCaptureRegionStore } from '../../ui/sourceCaptureRegionStore'
import { ImageItem } from './ImageItem'

const imageState = vi.hoisted(() => ({
  image: { width: 320, height: 180, naturalWidth: 320, naturalHeight: 180 } as HTMLImageElement | null,
  lastUrl: '' as string,
  regionHandlers: {} as {
    down?: (event: { cancelBubble: boolean; target: { getRelativePointerPosition: () => { x: number; y: number } } }) => void
    up?: (event: { cancelBubble: boolean; target: { getRelativePointerPosition: () => { x: number; y: number } } }) => void
  },
}))

vi.mock('use-image', () => ({
  default: (url: string) => {
    imageState.lastUrl = url
    return [imageState.image]
  },
}))

vi.mock('../../assets/thumbnailPipeline', () => ({
  ensureThumbnail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('react-konva', () => ({
  Group: React.forwardRef(function Group(
    { children }: { children: React.ReactNode },
    ref: React.ForwardedRef<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({ getLayer: () => ({ batchDraw: vi.fn() }) }))
    return <div data-testid="image-group">{children}</div>
  }),
  Image: () => <div data-testid="konva-image" />,
  Rect: ({ listening, onMouseDown, onMouseUp }: { listening?: boolean; onMouseDown?: unknown; onMouseUp?: unknown }) => {
    if (onMouseDown) {
      imageState.regionHandlers = {
        down: onMouseDown as typeof imageState.regionHandlers.down,
        up: onMouseUp as typeof imageState.regionHandlers.up,
      }
    }
    return <div data-testid="konva-rect" data-listening={String(listening ?? true)} data-region-selector={String(Boolean(onMouseDown))} />
  },
  Text: ({ text }: { text?: string }) => <div data-testid="konva-text">{text}</div>,
  Transformer: React.forwardRef(function Transformer(props: { anchorSize?: number }, ref: React.ForwardedRef<unknown>) {
    React.useImperativeHandle(ref, () => ({ nodes: vi.fn(), getLayer: () => ({ batchDraw: vi.fn() }) }))
    return <div data-testid="image-transformer" data-anchor-size={props.anchorSize} />
  }),
}))

const imageItem: CanvasItem = {
  id: 'image-relic-1',
  type: 'image',
  x: 20,
  y: 30,
  width: 320,
  height: 180,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
  src: 'C:/archive/memory.png',
}

beforeEach(() => {
  clearAssetMetadataForTest()
  imageState.lastUrl = ''
  imageState.regionHandlers = {}
  imageState.image = { width: 320, height: 180, naturalWidth: 320, naturalHeight: 180 } as HTMLImageElement
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Chamber',
      items: [imageItem],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useUIStore.setState({ toolMode: 'select', connectFromId: null })
  useSourceCaptureRegionStore.setState({ request: null })
})

afterEach(() => {
  useSourceCaptureRegionStore.getState().cancel()
  cleanup()
})

describe('ImageItem hit testing', () => {
  it('keeps a listening hit target so direct clicks can select or connect images', () => {
    render(<ImageItem item={imageItem} />)

    expect(screen.getAllByTestId('konva-rect')[0].getAttribute('data-listening')).toBe('true')
  })

  it('keeps hook order stable while the image loads asynchronously', () => {
    imageState.image = null
    useCanvasStore.setState({ selectedIds: [imageItem.id] })
    const { rerender } = render(<ImageItem item={imageItem} />)
    expect(screen.queryByTestId('image-group')).toBeNull()

    imageState.image = { width: 320, height: 180, naturalWidth: 320, naturalHeight: 180 } as HTMLImageElement

    expect(() => rerender(<ImageItem item={imageItem} />)).not.toThrow()
    expect(screen.getByTestId('konva-image')).toBeTruthy()
    expect(screen.getByTestId('image-transformer').getAttribute('data-anchor-size')).toBe('10')
  })

  it('returns a directly dragged region even while the source image is importing', async () => {
    imageState.image = null
    const choice = useSourceCaptureRegionStore.getState().choose(imageItem.id)

    render(<ImageItem item={imageItem} />)

    expect(screen.getByTestId('image-group')).toBeTruthy()
    expect(screen.getAllByTestId('konva-rect').some((rect) => rect.dataset.regionSelector === 'true')).toBe(true)

    const start = { x: 32, y: 36 }
    const event = { cancelBubble: false, target: { getRelativePointerPosition: () => start } }
    act(() => imageState.regionHandlers.down?.(event))
    const end = { x: 224, y: 108 }
    act(() => imageState.regionHandlers.up?.({ cancelBubble: false, target: { getRelativePointerPosition: () => end } }))

    const region = await choice
    expect(region).toMatchObject({ x: 0.1, y: 0.2, width: 0.6 })
    expect(region?.height).toBeCloseTo(0.4)
  })
})

describe('ImageItem thumbnail-first rendering', () => {
  it('renders the cached thumbnail when the relic is small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: true, thumbnailPath: 'C:/cache/thumb.png' })
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<ImageItem item={imageItem} />)

    expect(imageState.lastUrl).toBe('local:///C:/cache/thumb.png')
  })

  it('renders the full source at close zoom', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: true, thumbnailPath: 'C:/cache/thumb.png' })

    render(<ImageItem item={imageItem} />)

    expect(imageState.lastUrl).toBe('local:///C:/archive/memory.png')
  })

  it('renders the full source for selected relics even when small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: true, thumbnailPath: 'C:/cache/thumb.png' })
    useCanvasStore.setState((state) => ({
      selectedIds: [imageItem.id],
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<ImageItem item={imageItem} />)

    expect(imageState.lastUrl).toBe('local:///C:/archive/memory.png')
  })

  it('renders a placeholder with the filename when the source file is missing', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: false, thumbnailPath: null })
    imageState.image = null

    render(<ImageItem item={imageItem} />)

    expect(screen.getByTestId('image-group')).toBeTruthy()
    expect(screen.getByTestId('konva-text').textContent).toContain('memory.png')
    expect(screen.queryByTestId('konva-image')).toBeNull()
  })
})
