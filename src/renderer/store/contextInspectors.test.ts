// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasStore } from './canvasStore'
import { useUIStore } from './uiStore'

/**
 * The item inspector and the connection inspector are drawn in the same place,
 * so only one of them may ever be live. These cover the eviction in both
 * directions and the dismissal that clicking empty canvas relies on.
 */

const relic = (id: string) => ({
  id,
  type: 'image' as const,
  x: 0, y: 0, width: 10, height: 10,
  rotation: 0, zIndex: 0,
  locked: false, visible: true, opacity: 1,
  tags: [],
})

beforeEach(() => {
  Object.assign(window, { ipc: { invoke: vi.fn().mockResolvedValue({ ok: true }) } })
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Board',
      items: [relic('relic-a'), relic('relic-b')],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useUIStore.setState({
    activeConnectionId: null,
    panels: { ...useUIStore.getState().panels, connectionProperties: false },
  })
})

const inspectConnection = (id: string): void => {
  useUIStore.getState().setActiveConnectionId(id)
  useUIStore.getState().openPanel('connectionProperties')
}

describe('context inspectors', () => {
  it('closes the connection inspector when a relic is selected', () => {
    inspectConnection('thread-1')

    useCanvasStore.getState().setSelection(['relic-a'])

    expect(useUIStore.getState().activeConnectionId).toBeNull()
    expect(useUIStore.getState().panels.connectionProperties).toBe(false)
  })

  it('closes it when a relic joins an existing selection too', () => {
    useCanvasStore.getState().setSelection(['relic-a'])
    inspectConnection('thread-1')

    useCanvasStore.getState().addToSelection('relic-b')

    expect(useUIStore.getState().activeConnectionId).toBeNull()
  })

  it('leaves the connection alone when the selection is emptied', () => {
    inspectConnection('thread-1')

    useCanvasStore.getState().setSelection([])

    expect(useUIStore.getState().activeConnectionId).toBe('thread-1')
  })

  it('dismisses the connection and its panel together', () => {
    inspectConnection('thread-1')

    useUIStore.getState().dismissConnectionInspection()

    expect(useUIStore.getState().activeConnectionId).toBeNull()
    expect(useUIStore.getState().panels.connectionProperties).toBe(false)
  })

  it('keeps a connection the canvas is only pointing at out of the panel', () => {
    // A search hit reveals a related thread without opening anything, so the id
    // alone must not be read as "inspect this".
    useUIStore.getState().setActiveConnectionId('thread-1')

    expect(useUIStore.getState().panels.connectionProperties).toBe(false)
  })
})
