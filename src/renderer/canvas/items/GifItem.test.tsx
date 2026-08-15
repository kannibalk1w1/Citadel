// @vitest-environment jsdom
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { clearAssetMetadataForTest, recordAssetMetadata } from '../../assets/assetMetadata'
import { ensureThumbnail } from '../../assets/thumbnailPipeline'
import { GifItem } from './GifItem'

const stopGif = vi.fn()
let frameCallback: ((ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => void) | null = null
let lastImageProp: unknown = null

const imageState = vi.hoisted(() => ({
  image: { width: 256, height: 144, naturalWidth: 256, naturalHeight: 144 } as HTMLImageElement | null,
  lastUrl: '' as string,
}))

vi.mock('gifler', () => ({}))

// window.gifler is set by the browserify bundle, so it is not on the Window type.
const giflerMock = (): ReturnType<typeof vi.fn> =>
  (window as unknown as { gifler: ReturnType<typeof vi.fn> }).gifler

vi.mock('use-image', () => ({
  default: (url: string) => {
    imageState.lastUrl = url
    return [imageState.image]
  },
}))

vi.mock('../../assets/thumbnailPipeline', () => ({
  ensureThumbnail: vi.fn().mockResolvedValue(undefined),
  generateGifFirstFrameThumbnail: vi.fn().mockResolvedValue('data:image/png;base64,gif'),
}))

vi.mock('react-konva', () => ({
  Image: React.forwardRef(function Image(
    props: { image?: unknown },
    ref: React.ForwardedRef<{ getLayer: () => { batchDraw: () => void } }>,
  ) {
    lastImageProp = props.image
    React.useImperativeHandle(ref, () => ({ getLayer: () => ({ batchDraw: vi.fn() }) }))
    return <div data-testid="gif-konva-image" />
  }),
  Transformer: React.forwardRef(function Transformer(_props: unknown, ref: React.ForwardedRef<unknown>) {
    React.useImperativeHandle(ref, () => ({ nodes: vi.fn(), getLayer: () => ({ batchDraw: vi.fn() }) }))
    return <div data-testid="gif-transformer" />
  }),
}))

const gifItem: CanvasItem = {
  id: 'gif-relic-1',
  type: 'gif',
  x: 20,
  y: 30,
  width: 320,
  height: 180,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: ['sigil'],
  src: 'C:/archive/memory.gif',
}

beforeEach(() => {
  stopGif.mockReset()
  vi.mocked(ensureThumbnail).mockClear()
  clearAssetMetadataForTest()
  frameCallback = null
  lastImageProp = null
  imageState.lastUrl = ''
  imageState.image = { width: 256, height: 144, naturalWidth: 256, naturalHeight: 144 } as HTMLImageElement
  Object.assign(window, {
    gifler: vi.fn(() => ({
      frames: vi.fn((_canvas: HTMLCanvasElement, callback: typeof frameCallback) => {
        frameCallback = callback
      }),
      stop: stopGif,
    })),
  })
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Chamber',
      items: [gifItem],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useUIStore.setState({ toolMode: 'select' })
})

afterEach(() => cleanup())

describe('GifItem animation lifecycle', () => {
  it('stops playback and ignores late frames after the relic sleeps', () => {
    const { unmount } = render(<GifItem item={gifItem} />)
    expect(giflerMock()).toHaveBeenCalledWith('local:///C:/archive/memory.gif')
    expect(frameCallback).not.toBeNull()

    unmount()

    const drawImage = vi.fn()
    const frameBuffer = document.createElement('canvas')
    frameBuffer.width = 64
    frameBuffer.height = 64
    frameCallback?.({ drawImage } as unknown as CanvasRenderingContext2D, { buffer: frameBuffer })

    expect(stopGif).toHaveBeenCalledTimes(1)
    expect(drawImage).not.toHaveBeenCalled()
  })
})

describe('GifItem thumbnail-first rendering', () => {
  it('requests a first-frame thumbnail for local GIF relics', () => {
    render(<GifItem item={gifItem} />)

    expect(ensureThumbnail).toHaveBeenCalledWith(gifItem.src, expect.any(Function))
  })

  it('uses the cached first-frame thumbnail when small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.gif', exists: true, thumbnailPath: 'C:/cache/gif-thumb.png' })
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<GifItem item={gifItem} />)

    expect(imageState.lastUrl).toBe('local:///C:/cache/gif-thumb.png')
    expect(lastImageProp).toBe(imageState.image)
    expect(giflerMock()).not.toHaveBeenCalled()
  })
})
