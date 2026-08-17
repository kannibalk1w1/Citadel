// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUIStore } from '../../store/uiStore'
import { RuntimeStatsSigil } from './RuntimeStatsSigil'
import { canvasRuntimeStats } from '../../performance/canvasRuntimeStats'
import type { CanvasItem } from '../../../types'

const invoke = vi.fn().mockResolvedValue({ ok: true })
Object.defineProperty(window, 'ipc', { value: { invoke }, writable: true })

const item = (id: string): CanvasItem => ({
  id, type: 'image', x: 0, y: 0, width: 10, height: 10, rotation: 0,
  zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
})

describe('the board load readout', () => {
  afterEach(cleanup)

  beforeEach(() => {
    invoke.mockClear()
    useUIStore.setState({ boardLoadVisible: true })
  })

  it('names itself so it can be found and dismissed', () => {
    render(<RuntimeStatsSigil stats={canvasRuntimeStats([item('a')], [item('a')])} />)

    expect(screen.getByLabelText('Board runtime load')).toBeTruthy()
    expect(screen.getByText('1 / 1')).toBeTruthy()
  })

  it('toggles off and back on', () => {
    useUIStore.getState().toggleBoardLoad()
    expect(useUIStore.getState().boardLoadVisible).toBe(false)

    useUIStore.getState().toggleBoardLoad()
    expect(useUIStore.getState().boardLoadVisible).toBe(true)
  })

  it('remembers being turned off, so it does not come back next launch', () => {
    useUIStore.getState().toggleBoardLoad()

    expect(invoke).toHaveBeenCalledWith('settings:set', { key: 'ui.boardLoadVisible', value: false })
  })
})
