import React from 'react'
import { useUIStore } from '../store/uiStore'
import { visionStatusLabel } from '../canvas/visionModes'
import { ToolIcon } from './icons/ToolIcon'

/**
 * Says out loud that a vision check is on, and turns it off again.
 *
 * Deliberately a sibling of the canvas container rather than a child: the
 * checks are applied as a CSS filter on that container, so a chip inside it
 * would be greyscaled, blurred, and mirrored along with the board — unreadable
 * exactly when it matters most.
 *
 * Someone who forgets they are in Value mode will think their board lost its
 * colour, and someone who forgets they are mirrored will find nothing clickable,
 * so this is loud on purpose.
 */
export function VisionStatusChip(): React.ReactElement | null {
  const visionMode = useUIStore((s) => s.visionMode)
  const mirrorView = useUIStore((s) => s.mirrorView)
  const clearVisionChecks = useUIStore((s) => s.clearVisionChecks)

  const label = visionStatusLabel(visionMode, mirrorView)
  if (!label) return null

  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        // Clear of the top bar, which is painted after the canvas slot and would
        // otherwise swallow the clicks meant for this chip's own off switch.
        top: 'calc(var(--topbar-h) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '5px 8px 5px 10px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        aria-label="Turn off vision checks"
        title="Turn off vision checks (Shift+Y)"
        onClick={clearVisionChecks}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'transparent',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '2px 4px',
        }}
      >
        <ToolIcon name="close" size={12} />
      </button>
    </div>
  )
}
