import React, { useCallback, useEffect, useRef } from 'react'
import { useUIStore } from '../../store/uiStore'
import { ToolIcon } from '../icons/ToolIcon'

/**
 * The one part of the window that stays clickable while click-through is on.
 *
 * State comes from `uiStore.windowClickThrough`, which main owns and pushes
 * through `window:modeChanged` — this panel reads it and never keeps its own
 * copy. All it adds is geometry: it reports its rect so main knows which patch
 * of screen should still take the mouse.
 */

export const CLICK_THROUGH_EXIT_HINT = 'Ctrl+Alt+C'

function reportRegion(region: { x: number; y: number; width: number; height: number } | null): void {
  const ipc = (window as unknown as { ipc?: { invoke: (channel: string, payload: unknown) => Promise<unknown> } }).ipc
  void ipc?.invoke('window:setInteractiveRegion', region)?.catch?.(() => {})
}

export function ClickThroughPanel(): React.ReactElement | null {
  const clickThrough = useUIStore((s) => s.windowClickThrough)
  const applyWindowMode = useUIStore((s) => s.applyWindowMode)
  const ref = useRef<HTMLDivElement>(null)

  const publish = useCallback(() => {
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    reportRegion({ x: rect.left, y: rect.top, width: rect.width, height: rect.height })
  }, [])

  useEffect(() => {
    if (!clickThrough) {
      // Nothing should stay clickable once the mode is off, and a stale rect
      // would keep a dead patch of screen swallowing clicks.
      reportRegion(null)
      return
    }
    publish()
    window.addEventListener('resize', publish)
    return () => {
      window.removeEventListener('resize', publish)
      reportRegion(null)
    }
  }, [clickThrough, publish])

  if (!clickThrough) return null

  const exit = () => { void applyWindowMode({ clickThrough: false }) }

  return (
    <div
      ref={ref}
      // Announced rather than merely coloured: the window looks unchanged when
      // click-through turns on, so the state has to be stated.
      role="status"
      aria-live="polite"
      aria-label="Click-through is on"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '8px 10px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-md)',
        color: 'var(--text-primary)',
        pointerEvents: 'auto',
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
        <span>Clicks pass through</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
          {CLICK_THROUGH_EXIT_HINT}
        </span>
      </span>
      <button
        type="button"
        onClick={exit}
        title={`Stop click-through (${CLICK_THROUGH_EXIT_HINT})`}
        aria-label={`Stop click-through (${CLICK_THROUGH_EXIT_HINT})`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '4px 8px',
          background: 'var(--bg-ui)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-md)',
        }}
      >
        <ToolIcon name="close" size={13} />
        Stop
      </button>
    </div>
  )
}
