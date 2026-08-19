import React from 'react'
import { Actions } from '../keybinds/actions'
import { resolver } from '../keybinds/keybindResolver'

/** A compact orientation marker for the session-only browser build. */
export function DemoNotice(): React.ReactElement {
  return (
    <aside
      aria-label="Browser demo"
      className="citadel-motion-surface"
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: 'var(--z-modal)' as unknown as number,
        maxWidth: 'min(360px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '8px 10px',
        background: 'var(--bg-panel)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <span>This is a browser demo. Changes reset when you reload.</span>
      <button
        type="button"
        onClick={() => resolver.dispatch(Actions.OPEN_SHOWCASE)}
        style={{
          flex: '0 0 auto',
          padding: '4px 7px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-ui)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        Reset demo
      </button>
    </aside>
  )
}
