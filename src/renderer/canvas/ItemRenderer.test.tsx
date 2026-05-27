// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { DOMLayerItemRenderer, ItemRenderer } from './ItemRenderer'

vi.mock('react-konva', () => ({
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
  Rect: () => <div data-testid="konva-rect" />,
  Text: () => <div data-testid="konva-text" />,
}))

vi.mock('./items/Model3DItem', () => ({
  Model3DItem: ({ item, domOnly }: { item: CanvasItem; domOnly?: boolean }) => (
    <div data-testid="model3d-item" data-dom-only={domOnly ? 'true' : 'false'}>{item.id}</div>
  ),
}))

afterEach(() => cleanup())

function modelItem(overrides: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id: 'model-1',
    type: 'model3d',
    x: 10,
    y: 20,
    width: 320,
    height: 320,
    rotation: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
    src: 'C:\\models\\sample.gltf',
    ...overrides,
  }
}

describe('ItemRenderer DOM-layer items', () => {
  it('keeps 3D models out of the Konva stage tree', () => {
    useCanvasStore.setState({
      boards: [{
        id: 'board-1',
        name: 'Board 1',
        items: [],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      }],
      activeBoardId: 'board-1',
    })

    render(<ItemRenderer item={modelItem()} />)

    expect(screen.queryByTestId('konva-rect')).toBeNull()
    expect(screen.queryByTestId('model3d-item')).toBeNull()
    expect(screen.queryByTestId('konva-group')).toBeNull()
  })

  it('renders the 3D model in the DOM layer outside the stage', () => {
    render(<DOMLayerItemRenderer item={modelItem()} />)

    expect(screen.getByTestId('model3d-item').dataset.domOnly).toBe('true')
    expect(screen.queryByTestId('konva-rect')).toBeNull()
  })
})
