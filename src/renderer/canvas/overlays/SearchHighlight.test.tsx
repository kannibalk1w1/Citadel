// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { SearchHighlight } from './SearchHighlight'

vi.mock('react-konva', () => ({
  Group: ({
    children,
    'data-index-mark-id': indexMarkId,
    'data-testid': testId,
  }: {
    children: React.ReactNode
    'data-index-mark-id'?: string
    'data-testid'?: string
  }) => <div data-index-mark-id={indexMarkId} data-testid={testId}>{children}</div>,
  Line: () => <div data-testid="konva-line" />,
  Rect: () => <div data-testid="konva-rect" />,
  Text: ({ text }: { text: string }) => <div data-testid="konva-text">{text}</div>,
}))

function item(id: string, x: number, tags = ['gate']): CanvasItem {
  return {
    id,
    type: 'image',
    x,
    y: 20,
    width: 100,
    height: 80,
    rotation: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    opacity: 1,
    tags,
    src: `C:/refs/${id}.png`,
  }
}

beforeEach(() => {
  Object.assign(window, {
    matchMedia: vi.fn().mockReturnValue({ matches: true }),
  })

  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Board 1',
      items: [],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })

  useUIStore.setState({
    panels: {
      itemProperties: false,
      connectionProperties: false,
      keybindSettings: false,
      tagSearch: true,
      presentationSequence: false,
      boardNavigator: false,
      assetLibrary: false,
    },
    searchQuery: 'gate',
    searchHighlightId: null,
  })
})

afterEach(() => cleanup())

describe('SearchHighlight Index marks', () => {
  it('renders a sigil mark for each matching Index result', () => {
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({
        ...board,
        items: [item('gate-one', 0), item('gate-two', 120), item('tower', 240, ['tower'])],
      })),
    }))

    render(<SearchHighlight />)

    const marks = screen.getAllByTestId('index-mark')
    expect(marks).toHaveLength(2)
    expect(marks.map((mark) => mark.dataset.indexMarkId)).toEqual(['gate-one', 'gate-two'])
  })

  it('caps active Index marks for large result sets', () => {
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({
        ...board,
        items: Array.from({ length: 30 }, (_, index) => item(`gate-${String(index).padStart(2, '0')}`, index * 20)),
      })),
    }))

    render(<SearchHighlight />)

    expect(screen.getAllByTestId('index-mark')).toHaveLength(24)
  })

  it('only renders Index marks for visible search results when visibility context is provided', () => {
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({
        ...board,
        items: [
          item('gate-offscreen-a', 0),
          item('gate-visible-a', 120),
          item('gate-offscreen-b', 240),
          item('gate-visible-b', 360),
        ],
      })),
    }))

    render(<SearchHighlight visibleItemIds={new Set(['gate-visible-a', 'gate-visible-b'])} />)

    const marks = screen.getAllByTestId('index-mark')
    expect(marks).toHaveLength(2)
    expect(marks.map((mark) => mark.dataset.indexMarkId)).toEqual(['gate-visible-a', 'gate-visible-b'])
  })
})
