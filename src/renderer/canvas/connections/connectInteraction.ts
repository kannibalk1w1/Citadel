import { nanoid } from 'nanoid'
import type { Connection } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'

export type ConnectRelicClickResult = 'armed' | 'created' | 'ignored'

function createDefaultBinding(fromId: string, toId: string): Connection {
  return {
    id: nanoid(),
    fromId,
    toId,
    fromAnchor: 'auto',
    toAnchor: 'auto',
    style: 'bezier',
    color: '#b99455',
    width: 1.5,
    arrowHead: 'arrow',
    dashed: false,
  }
}

export function handleConnectRelicClick(boardId: string | null | undefined, itemId: string): ConnectRelicClickResult {
  if (!boardId) return 'ignored'

  const ui = useUIStore.getState()
  const fromId = ui.connectFromId
  if (!fromId) {
    ui.setConnectFromId(itemId)
    return 'armed'
  }
  if (fromId === itemId) return 'ignored'

  const connection = createDefaultBinding(fromId, itemId)
  useCanvasStore.getState().addConnection(boardId, connection)
  useHistoryStore.getState().push('CONNECTION_ADD', boardId, null, connection)
  ui.triggerBindingPulse(connection.id)
  ui.setConnectFromId(null)
  ui.setToolMode('select')
  return 'created'
}
