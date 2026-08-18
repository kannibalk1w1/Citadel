// @vitest-environment jsdom
import { readFileSync } from 'fs'
import { join } from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openShowcase, saveCurrentOrAs } from './projectFile'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'

const showcase = readFileSync(join(process.cwd(), 'examples', 'showcase.citadel'), 'utf-8')
const invoke = vi.fn()
Object.defineProperty(window, 'ipc', { value: { invoke }, writable: true })

describe('opening the example project', () => {
  beforeEach(() => {
    invoke.mockReset()
    useCanvasStore.setState({ boards: [], activeBoardId: null, selectedIds: [] })
    useHistoryStore.getState().resetHistory()
  })

  it('loads the shipped boards', async () => {
    invoke.mockImplementation(async (channel: string) => (
      channel === 'showcase:load' ? { data: showcase } : { ok: true }
    ))

    expect(await openShowcase()).toBe(true)
    expect(useCanvasStore.getState().boards.length).toBeGreaterThanOrEqual(4)
    expect(useCanvasStore.getState().activeBoardId).toBe('board-start')
  })

  /**
   * The example lives in the app's own resources, which are read-only wherever
   * the app is properly installed. Adopting its path would point Ctrl+S at a
   * file the user cannot write, and the save would just fail.
   */
  it('does not adopt the read-only path it came from', async () => {
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'showcase:load') return { data: showcase }
      if (channel === 'file:saveDialog') return { path: null }   // user cancels
      return { ok: true }
    })
    await openShowcase()

    await saveCurrentOrAs()

    // A project with a path saves straight to it; this one has to ask.
    expect(invoke).toHaveBeenCalledWith('file:saveDialog', expect.anything())
    expect(invoke).not.toHaveBeenCalledWith('file:save', expect.anything())
  })

  it('says so rather than blanking the board when the example is missing', async () => {
    invoke.mockImplementation(async (channel: string) => (
      channel === 'showcase:load' ? { data: null } : { ok: true }
    ))
    useCanvasStore.getState().initDefaultBoard()
    const before = useCanvasStore.getState().boards.length

    expect(await openShowcase()).toBe(false)
    expect(useCanvasStore.getState().boards).toHaveLength(before)
  })
})
