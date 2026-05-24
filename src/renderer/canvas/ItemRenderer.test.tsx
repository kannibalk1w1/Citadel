// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { ItemRenderer } from './ItemRenderer'

vi.mock('react-konva', () => ({
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
  Rect: () => <div data-testid="konva-rect" />,
  Text: () => <div data-testid="konva-text" />,
}))

vi.mock('./items/Model3DItem', () => ({
  Model3DItem: ({ item }: { item: CanvasItem }) => <div data-testid="model3d-item">{item.id}</div>,
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
  it('does not wrap 3D model DOM portals inside a Konva group', () => {
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

    expect(screen.getByTestId('model3d-item')).toBeTruthy()
    expect(screen.queryByTestId('konva-group')).toBeNull()
  })
})
