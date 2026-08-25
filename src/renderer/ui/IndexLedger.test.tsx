// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'

const buildSpy = vi.hoisted(() => vi.fn())

vi.mock('./indexLedgerModel', async () => {
  const actual = await vi.importActual<typeof import('./indexLedgerModel')>('./indexLedgerModel')
  buildSpy.mockImplementation(actual.buildLedgerRows)
  return { ...actual, buildLedgerRows: buildSpy }
})

const { IndexLedger } = await import('./IndexLedger')

const relic = (id: string, tags: string[]): CanvasItem => ({
  id,
  type: 'image',
  x: 0,
  y: 0,
  width: 120,
  height: 90,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags,
  src: `C:/refs/${id}.png`,
})

beforeEach(() => {
  buildSpy.mockClear()
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Board 1',
      items: [relic('gate', ['gate']), relic('tower', ['tower'])],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useUIStore.setState({ panels: { ...useUIStore.getState().panels, indexLedger: true } })
})

afterEach(() => cleanup())

describe('IndexLedger row building', () => {
  it('walks the boards once no matter how much the filter is typed into', () => {
    render(<IndexLedger />)
    expect(buildSpy).toHaveBeenCalledTimes(1)

    const input = screen.getByPlaceholderText('Filter the index…')
    fireEvent.change(input, { target: { value: 't' } })
    fireEvent.change(input, { target: { value: 'to' } })
    fireEvent.change(input, { target: { value: 'tow' } })

    expect(buildSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByText('1 entries')).toBeTruthy()
  })

  it('does not walk the boards again when a sort column is clicked', () => {
    render(<IndexLedger />)
    buildSpy.mockClear()

    fireEvent.click(screen.getByText('Type'))
    fireEvent.click(screen.getByText('Type'))

    expect(buildSpy).not.toHaveBeenCalled()
  })

  it('rebuilds when the boards themselves change', () => {
    render(<IndexLedger />)
    buildSpy.mockClear()

    act(() => {
      useCanvasStore.setState({
        boards: [{
          ...useCanvasStore.getState().boards[0],
          items: [relic('gate', ['gate'])],
        }],
      })
    })

    expect(buildSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByText('1 entries')).toBeTruthy()
  })
})
