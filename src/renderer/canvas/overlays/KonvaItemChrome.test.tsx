// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { KonvaItemChrome } from './KonvaItemChrome'

vi.mock('react-konva', () => ({
  Group: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) => <div data-testid={testId ?? 'konva-group'}>{children}</div>,
  Rect: () => <div data-testid="konva-rect" />,
  Text: ({ text }: { text: string }) => <div data-testid="konva-text">{text}</div>,
}))

afterEach(() => cleanup())

const sticky: CanvasItem = {
  id: 'sticky-1',
  type: 'sticky',
  x: 20,
  y: 30,
  width: 180,
  height: 120,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
  meta: { frameVariant: 'relic' },
}

describe('KonvaItemChrome', () => {
  it('renders sticky note frame chrome in an overlay layer', () => {
    useCanvasStore.setState({
      boards: [{
        id: 'board-1',
        name: 'Board 1',
        items: [sticky],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      }],
      activeBoardId: 'board-1',
      selectedIds: ['sticky-1'],
    })

    render(<KonvaItemChrome />)

    expect(screen.getByTestId('konva-item-chrome')).toBeTruthy()
    expect(screen.getByText('PIN')).toBeTruthy()
  })
})

