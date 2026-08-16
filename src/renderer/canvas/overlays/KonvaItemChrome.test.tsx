// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { canvasColor } from '../../theme/canvasColors'
import { KonvaItemChrome } from './KonvaItemChrome'

vi.mock('react-konva', () => ({
  Group: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) => <div data-testid={testId ?? 'konva-group'}>{children}</div>,
  Rect: ({ stroke, opacity }: { stroke?: string; opacity?: number }) => (
    <div data-testid="konva-rect" data-stroke={stroke} data-opacity={opacity} />
  ),
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

  it('uses a brighter frame for the armed Binding source', () => {
    useCanvasStore.setState({
      boards: [{
        id: 'board-1',
        name: 'Board 1',
        items: [sticky],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      }],
      activeBoardId: 'board-1',
      selectedIds: [],
    })
    useUIStore.setState({ toolMode: 'connect', connectFromId: 'sticky-1' })

    render(<KonvaItemChrome />)

    // The theme's accent, read from the palette rather than written out here.
    // This used to assert '#bd9652', a fallback hardcoded in a local copy of the
    // token resolver that differed from --accent, so the chrome painted a
    // colour the rest of the canvas never used.
    expect(screen.getAllByTestId('konva-rect')[0].getAttribute('data-stroke')).toBe(canvasColor('accent'))
    expect(screen.getAllByTestId('konva-rect')[0].getAttribute('data-opacity')).toBe('0.32')
  })
})
