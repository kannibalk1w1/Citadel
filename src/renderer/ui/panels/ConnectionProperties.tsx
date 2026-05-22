import React from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'

export function ConnectionProperties(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.connectionProperties)
  const activeConnectionId = useUIStore((s) => s.activeConnectionId)
  const connections = useCanvasStore((s) => s.connections())
  const updateConnection = useCanvasStore((s) => s.updateConnection)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)

  if (!isOpen || !activeConnectionId || !activeBoardId) return null

  const conn = connections.find((c) => c.id === activeConnectionId)
  if (!conn) return null

  const update = (patch: Parameters<typeof updateConnection>[2]) =>
    updateConnection(activeBoardId, conn.id, patch)

  return (
    <div className="citadel-floating-panel" style={{ position: 'absolute', top: 48, right: 'calc(var(--sidebar-right-w) + 8px)', width: 220, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, zIndex: 'var(--z-panels)', boxShadow: 'var(--shadow-md)' }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Connection
      </h3>

      <label style={labelStyle}>Style
        <select value={conn.style} onChange={(e) => update({ style: e.target.value as never })} style={selectStyle}>
          <option value="straight">Straight</option>
          <option value="bezier">Bezier</option>
          <option value="elbow">Elbow</option>
        </select>
      </label>

      <label style={labelStyle}>Arrow
        <select value={conn.arrowHead} onChange={(e) => update({ arrowHead: e.target.value as never })} style={selectStyle}>
          <option value="none">None</option>
          <option value="arrow">Arrow</option>
          <option value="dot">Dot</option>
          <option value="diamond">Diamond</option>
        </select>
      </label>

      <label style={labelStyle}>Color
        <input type="color" value={conn.color} onChange={(e) => update({ color: e.target.value })} style={{ height: 22, width: '100%', cursor: 'pointer' }} />
      </label>

      <label style={labelStyle}>Width
        <input type="range" min={1} max={8} value={conn.width} onChange={(e) => update({ width: parseInt(e.target.value) })} style={{ width: '100%' }} />
      </label>

      <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={conn.dashed} onChange={(e) => update({ dashed: e.target.checked })} />
        Dashed
      </label>

      <label style={labelStyle}>Label
        <input value={conn.label ?? ''} onChange={(e) => update({ label: e.target.value || undefined })} style={inputStyle} placeholder="optional label" />
      </label>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }
const selectStyle: React.CSSProperties = { background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)', fontSize: 11, padding: '2px 4px' }
const inputStyle: React.CSSProperties = { background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)', fontSize: 11, padding: '3px 6px', fontFamily: 'var(--font-mono)', outline: 'none', width: '100%' }
