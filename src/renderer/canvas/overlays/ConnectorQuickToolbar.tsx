import React from 'react'
import type { Connection } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { askInscription } from '../../ui/prompt/inscriptionPromptStore'
import { useUIStore } from '../../store/uiStore'
import { connectionQuickToolbarPosition } from './boardChromeViewModel'
import { ToolIcon, type ToolIconName } from '../../ui/icons/ToolIcon'

function itemCenter(item: { x: number; y: number; width: number; height: number }, viewport: { x: number; y: number; scale: number }) {
  return {
    x: (item.x + item.width / 2) * viewport.scale + viewport.x,
    y: (item.y + item.height / 2) * viewport.scale + viewport.y,
  }
}

// `active` marks a style the connection currently carries, so it maps to
// aria-pressed rather than to colour alone.
function Button({ title, icon, onClick, active, danger = false }: {
  title: string
  icon: ToolIconName
  active?: boolean
  danger?: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={(event) => { event.stopPropagation(); onClick() }}
      style={{
        width: 28,
        height: 26,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-muted)',
        background: active ? 'var(--accent)' : 'var(--bg-ui)',
        color: active ? 'var(--bg-ui)' : danger ? 'var(--accent-danger)' : 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ToolIcon name={icon} size={14} />
    </button>
  )
}

export function ConnectorQuickToolbar(): React.ReactElement | null {
  const activeConnectionId = useUIStore((s) => s.activeConnectionId)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const connections = useCanvasStore((s) => s.connections())
  const items = useCanvasStore((s) => s.items())
  const viewport = useCanvasStore((s) => s.viewport())
  const updateConnection = useCanvasStore((s) => s.updateConnection)
  const removeConnection = useCanvasStore((s) => s.removeConnection)

  if (!activeConnectionId || !activeBoardId) return null
  const conn = connections.find((connection) => connection.id === activeConnectionId)
  if (!conn) return null
  const fromItem = items.find((item) => item.id === conn.fromId)
  const toItem = items.find((item) => item.id === conn.toId)
  if (!fromItem || !toItem) return null

  const position = connectionQuickToolbarPosition(itemCenter(fromItem, viewport), itemCenter(toItem, viewport))
  const update = (patch: Partial<Connection>) => {
    updateConnection(activeBoardId, conn.id, patch)
    useHistoryStore.getState().push('CONNECTION_STYLE', activeBoardId, { id: conn.id }, { id: conn.id, ...patch })
  }
  const editLabel = () => {
    void askInscription('Connection label:', conn.label ?? '').then((label) => {
      if (label === null) return
      update({ label: label || undefined })
    })
  }
  const remove = () => {
    removeConnection(activeBoardId, conn.id)
    useHistoryStore.getState().push('CONNECTION_DELETE', activeBoardId, conn, { id: conn.id })
    useUIStore.getState().dismissConnectionInspection()
  }

  return (
    <div
      className="citadel-action-strip citadel-connector-strip"
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        transform: position.transform,
        zIndex: 'var(--z-panels)',
        display: 'flex',
        gap: 'var(--space-2)',
        padding: 4,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(180deg, #17130f 0%, #0a0908 100%)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.72)',
        pointerEvents: 'auto',
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Button title="Edit label" icon="edit" onClick={editLabel} />
      <Button title="Arrow head" icon="arrowHead" active={conn.arrowHead === 'arrow'} onClick={() => update({ arrowHead: conn.arrowHead === 'arrow' ? 'none' : 'arrow' })} />
      <Button title="Diamond head" icon="diamondHead" active={conn.arrowHead === 'diamond'} onClick={() => update({ arrowHead: conn.arrowHead === 'diamond' ? 'none' : 'diamond' })} />
      <Button title="Dashed line" icon="dashed" active={conn.dashed} onClick={() => update({ dashed: !conn.dashed })} />
      <Button title="Delete connection" icon="trash" danger onClick={remove} />
    </div>
  )
}

