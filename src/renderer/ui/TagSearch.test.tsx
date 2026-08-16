// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem, Connection } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { TagSearch } from './TagSearch'

const mockInvoke = vi.fn().mockResolvedValue({ ok: true })

const baseItem: CanvasItem = {
  id: 'gate-relic',
  type: 'image',
  x: 100,
  y: 200,
  width: 160,
  height: 120,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: ['gate'],
  src: 'C:/refs/gate.png',
}

const baseConnection: Connection = {
  id: 'thread-gate-note',
  fromId: 'gate-relic',
  toId: 'gate-note',
  fromAnchor: 'auto',
  toAnchor: 'auto',
  style: 'bezier',
  color: '#bd9652',
  width: 1,
  arrowHead: 'arrow',
  meaning: 'reference',
  dashed: false,
}

beforeEach(() => {
  Object.assign(window, {
    ipc: { invoke: mockInvoke },
    innerWidth: 1200,
    innerHeight: 800,
  })
  mockInvoke.mockClear()

  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Board 1',
      items: [
        baseItem,
        {
          ...baseItem,
          id: 'gate-note',
          type: 'sticky',
          x: 500,
          y: 300,
          src: undefined,
          meta: { content: 'Gate memory note' },
        },
      ],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })

  useUIStore.setState({
    panels: {
      itemProperties: false,
      commandPalette: false,
      connectionProperties: false,
      keybindSettings: false,
      tagSearch: true,
      presentationSequence: false,
      boardNavigator: false,
      assetLibrary: false,
      indexLedger: false,
      archiveWorkbench: false,
      onboarding: false,
    },
    searchQuery: 'gate',
    searchHighlightId: null,
    activeConnectionId: null,
  })
})

afterEach(() => cleanup())

describe('TagSearch keyboard interactions', () => {
  it('focuses the active Index result and closes on Enter', async () => {
    render(<TagSearch />)

    const input = screen.getByPlaceholderText('Search boards, items, notes, tags…')
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeTruthy())

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(useCanvasStore.getState().selectedIds).toEqual(['gate-relic'])
    expect(useUIStore.getState().panels.tagSearch).toBe(false)
    expect(screen.queryByPlaceholderText('Search the Index...')).toBeNull()
  })

  it('focuses the active Index result and stays open on Ctrl+Enter', async () => {
    render(<TagSearch />)

    const input = screen.getByPlaceholderText('Search boards, items, notes, tags…')
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeTruthy())

    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

    expect(useCanvasStore.getState().selectedIds).toEqual(['gate-relic'])
    expect(useUIStore.getState().panels.tagSearch).toBe(true)
    expect(screen.getByPlaceholderText('Search boards, items, notes, tags…')).toBeTruthy()
  })

  it('travels to a dormant chamber when focusing its result', async () => {
    useCanvasStore.setState((state) => ({
      boards: [
        ...state.boards,
        {
          id: 'board-2',
          name: 'Vault',
          items: [{
            ...baseItem,
            id: 'vault-gate',
            type: 'sticky',
            x: 1000,
            y: 2000,
            src: undefined,
            meta: { content: 'gate sketches' },
          }],
          connections: [],
          viewport: { x: 0, y: 0, scale: 2 },
        },
      ],
    }))

    render(<TagSearch />)

    await waitFor(() => expect(screen.getByText('1 / 3')).toBeTruthy())
    expect(screen.getAllByText(/board: Vault/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText('gate sketches')[0])

    const canvas = useCanvasStore.getState()
    expect(canvas.activeBoardId).toBe('board-2')
    expect(canvas.selectedIds).toEqual(['vault-gate'])
    const vault = canvas.boards.find((board) => board.id === 'board-2')!
    // centered on the relic at the Vault's own scale (2x)
    expect(vault.viewport.x).toBeLessThan(0)
    expect(vault.viewport.y).toBe(800 / 2 - (2000 + 120 / 2) * 2)
  })

  it('reveals a directly related connection when focusing an item result', async () => {
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({
        ...board,
        connections: [baseConnection],
      })),
    }))

    render(<TagSearch />)

    const input = screen.getByPlaceholderText('Search boards, items, notes, tags…')
    await waitFor(() => expect(screen.getByText('1 / 3')).toBeTruthy())

    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

    expect(useCanvasStore.getState().selectedIds).toEqual(['gate-relic'])
    expect(useUIStore.getState().activeConnectionId).toBe('thread-gate-note')
    expect(useUIStore.getState().panels.connectionProperties).toBe(false)
  })
})
