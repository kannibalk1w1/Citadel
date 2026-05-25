// @vitest-environment jsdom
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { GifItem } from './GifItem'

const stopGif = vi.fn()
let frameCallback: ((ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => void) | null = null

vi.mock('gifler', () => ({}))

vi.mock('react-konva', () => ({
  Image: React.forwardRef(function Image(
    _props: unknown,
    ref: React.ForwardedRef<{ getLayer: () => { batchDraw: () => void } }>,
  ) {
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
  frameCallback = null
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
    expect(window.gifler).toHaveBeenCalledWith('local:///C:/archive/memory.gif')
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
