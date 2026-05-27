// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { ImageItem } from './ImageItem'

const imageState = vi.hoisted(() => ({
  image: { width: 320, height: 180, naturalWidth: 320, naturalHeight: 180 } as HTMLImageElement | null,
}))

vi.mock('use-image', () => ({
  default: () => [imageState.image],
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
  Rect: ({ listening }: { listening?: boolean }) => (
    <div data-testid="konva-rect" data-listening={String(listening ?? true)} />
  ),
  Transformer: React.forwardRef(function Transformer(_props: unknown, ref: React.ForwardedRef<unknown>) {
    React.useImperativeHandle(ref, () => ({ nodes: vi.fn(), getLayer: () => ({ batchDraw: vi.fn() }) }))
    return <div data-testid="image-transformer" />
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
})

afterEach(() => cleanup())

describe('ImageItem hit testing', () => {
  it('keeps a listening hit target so direct clicks can select or connect images', () => {
    render(<ImageItem item={imageItem} />)

    expect(screen.getAllByTestId('konva-rect')[0].getAttribute('data-listening')).toBe('true')
  })

  it('keeps hook order stable while the image loads asynchronously', () => {
    imageState.image = null
    const { rerender } = render(<ImageItem item={imageItem} />)
    expect(screen.queryByTestId('image-group')).toBeNull()

    imageState.image = { width: 320, height: 180, naturalWidth: 320, naturalHeight: 180 } as HTMLImageElement

    expect(() => rerender(<ImageItem item={imageItem} />)).not.toThrow()
    expect(screen.getByTestId('konva-image')).toBeTruthy()
  })
})
