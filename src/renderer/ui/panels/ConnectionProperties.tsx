import React from 'react'
import { normalizeThreadMeaning, threadMeaningOptions } from '../../canvas/connections/threadMeaning'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { ToolIcon } from '../icons/ToolIcon'

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
    <div className="citadel-floating-panel citadel-context-inspector" style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Connection
        </h3>
        <button
          type="button"
          title="Close"
          aria-label="Close"
          onClick={() => {
            useUIStore.getState().setActiveConnectionId(null)
            useUIStore.getState().closePanel('connectionProperties')
          }}
          style={{ ...iconButtonStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ToolIcon name="close" size={14} />
        </button>
      </div>

      <label style={labelStyle}>Label
        <input
          value={conn.label ?? ''}
          onChange={(e) => update({ label: e.target.value || undefined })}
          style={inputStyle}
          placeholder="names the connection"
        />
      </label>

      <label style={labelStyle}>Meaning
        <select
          value={conn.meaning ?? ''}
          onChange={(e) => update({ meaning: normalizeThreadMeaning(e.target.value) })}
          style={selectStyle}
        >
          <option value="">Unlabelled</option>
          {threadMeaningOptions.map((meaning) => (
            <option key={meaning.value} value={meaning.value}>{meaning.label}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>Shape
        <select value={conn.style} onChange={(e) => update({ style: e.target.value as never })} style={selectStyle}>
          <option value="bezier">Curved</option>
          <option value="elbow">Elbow</option>
          <option value="straight">Straight</option>
        </select>
      </label>

      <label style={labelStyle}>Endpoint
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

      <label style={labelStyle}>Stroke Width
        <input type="range" min={1} max={8} value={conn.width} onChange={(e) => update({ width: parseInt(e.target.value) })} style={{ width: '100%' }} />
      </label>

      <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 'var(--space-4)' }}>
        <input type="checkbox" checked={conn.dashed} onChange={(e) => update({ dashed: e.target.checked })} />
        Dashed line
      </label>

      <div style={previewStyle}>
        <svg width="100%" height="42" viewBox="0 0 180 42" aria-hidden="true">
          <path
            d={conn.style === 'elbow' ? 'M12 30 L84 30 L84 12 L168 12' : conn.style === 'straight' ? 'M12 30 L168 12' : 'M12 30 C70 30 98 12 168 12'}
            fill="none"
            stroke={conn.color}
            strokeWidth={conn.width}
            strokeDasharray={conn.dashed ? '8 4' : undefined}
            strokeLinecap="round"
          />
          <rect x="57" y="10" width="66" height="20" rx="4" fill="var(--bg-panel)" stroke="var(--border)" />
          <text x="90" y="24" textAnchor="middle" fill="var(--text-primary)" fontSize="10">{conn.label || conn.meaning || 'label'}</text>
        </svg>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 48,
  right: 'calc(var(--context-rail-w) + 8px)',
  width: 248,
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 12,
  zIndex: 'var(--z-panels)',
  boxShadow: 'var(--shadow-md)',
}
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }
const selectStyle: React.CSSProperties = { background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-md)', padding: '2px 4px' }
const inputStyle: React.CSSProperties = { background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-md)', padding: '3px 6px', fontFamily: 'var(--font-mono)', outline: 'none', width: '100%' }
const iconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-ui)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  lineHeight: 1,
}
const previewStyle: React.CSSProperties = {
  marginTop: 8,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-ui)',
  padding: 6,
}
