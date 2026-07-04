// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { autoSave, clearRecoveryIfClean, parseRecoveryData, resetRecoveryAutosaveCacheForTests } from './projectFile'

const mockInvoke = vi.fn().mockResolvedValue({ ok: true })

beforeEach(() => {
  Object.assign(window, { ipc: { invoke: mockInvoke } })
  mockInvoke.mockClear()
  resetRecoveryAutosaveCacheForTests()
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
  useHistoryStore.setState({
    events: [],
    cursor: -1,
    savedCursor: -1,
    recordingSession: null,
    isRecording: false,
    recordings: [],
  })
})

describe('projectFile autosave recovery', () => {
  it('skips recovery writes when the project is clean', async () => {
    useHistoryStore.getState().markSaved()

    await expect(autoSave()).resolves.toBe('skipped-clean')

    expect(mockInvoke).not.toHaveBeenCalledWith('file:saveRecovery', expect.anything())
  })

  it('writes recovery when the project is dirty', async () => {
    useHistoryStore.getState().markDirty()

    await expect(autoSave()).resolves.toBe('saved')

    expect(mockInvoke).toHaveBeenCalledWith('file:saveRecovery', {
      data: expect.stringContaining('"kind": "citadel-recovery"'),
    })
  })

  it('skips duplicate recovery payloads after a successful write', async () => {
    useHistoryStore.getState().markDirty()

    await expect(autoSave()).resolves.toBe('saved')
    await expect(autoSave()).resolves.toBe('skipped-unchanged')

    expect(mockInvoke.mock.calls.filter(([channel]) => channel === 'file:saveRecovery')).toHaveLength(1)
  })

  it('clears recovery only when the project is clean', async () => {
    useHistoryStore.getState().markDirty()
    await expect(clearRecoveryIfClean()).resolves.toBe(false)

    useHistoryStore.getState().markSaved()
    await expect(clearRecoveryIfClean()).resolves.toBe(true)

    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(mockInvoke).toHaveBeenCalledWith('recovery:clear')
  })

  it('migrates legacy recovery projects through the project schema', () => {
    const recovery = parseRecoveryData(JSON.stringify({
      boards: [{
        id: 'legacy-board',
        name: 'Legacy',
        items: [{
          id: 'item-1',
          type: 'sticky',
          x: 10,
          y: 20,
          width: 100,
          height: 80,
        }],
      }],
    }))

    expect(recovery.project.version).toBe('1.0.0')
    expect(recovery.project.activeBoardId).toBe('legacy-board')
    expect(recovery.project.boards[0].items[0]).toMatchObject({
      locked: false,
      visible: true,
      opacity: 1,
      tags: [],
    })
  })
})
