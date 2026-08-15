import { beforeEach, describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { handleConnectRelicClick } from './connectInteraction'
import { canvasColor } from '../../theme/canvasColors'

const source: CanvasItem = {
  id: 'source-relic',
  type: 'image',
  x: 10,
  y: 20,
  width: 100,
  height: 80,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
}

const target: CanvasItem = {
  ...source,
  id: 'target-relic',
  x: 180,
}

beforeEach(() => {
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Chamber',
      items: [source, target],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useHistoryStore.getState().resetHistory()
  useUIStore.setState({
    toolMode: 'connect',
    connectFromId: null,
    bindingPulse: null,
  })
})

describe('handleConnectRelicClick', () => {
  it('arms the first relic as the Binding source', () => {
    const result = handleConnectRelicClick('board-1', source.id)

    expect(result).toBe('armed')
    expect(useUIStore.getState().connectFromId).toBe(source.id)
    expect(useCanvasStore.getState().connections()).toEqual([])
  })

  it('creates a Binding thread from the armed source to a second relic', () => {
    handleConnectRelicClick('board-1', source.id)

    const result = handleConnectRelicClick('board-1', target.id)
    const [thread] = useCanvasStore.getState().connections()

    expect(result).toBe('created')
    expect(thread).toMatchObject({
      fromId: source.id,
      toId: target.id,
      fromAnchor: 'auto',
      toAnchor: 'auto',
      style: 'bezier',
      // New connections take the live theme accent, not the abandoned
      // grey-green; existing saved connections keep whatever they stored.
      color: canvasColor('accent'),
      width: 1.5,
      arrowHead: 'arrow',
      dashed: false,
    })
    expect(useHistoryStore.getState().events[0]).toMatchObject({
      type: 'CONNECTION_ADD',
      boardId: 'board-1',
      before: null,
      after: thread,
    })
    expect(useUIStore.getState().bindingPulse?.connectionId).toBe(thread.id)
    expect(useUIStore.getState().connectFromId).toBeNull()
    expect(useUIStore.getState().toolMode).toBe('select')
  })
})
