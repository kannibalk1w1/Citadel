import React, { useEffect } from 'react'
import { useSourceCaptureRegionStore } from './sourceCaptureRegionStore'

/** A non-modal guide that keeps the canvas available for direct region drawing. */
export function SourceCaptureRegionPicker(): React.ReactElement | null {
  const request = useSourceCaptureRegionStore((state) => state.request)

  useEffect(() => {
    if (!request) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      useSourceCaptureRegionStore.getState().cancel()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [request])

  if (!request) return null

  return (
    <aside
      aria-label="Image region selection"
      style={{
        position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 'var(--z-panels)' as React.CSSProperties['zIndex'],
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '8px 10px',
        background: 'var(--bg-panel)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
      }}
    >
      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>
        Drag across the image to mark the captured area.
      </span>
      <button
        type="button"
        onClick={() => useSourceCaptureRegionStore.getState().skip()}
        style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', padding: '4px 8px' }}
      >
        Skip
      </button>
      <button
        type="button"
        onClick={() => useSourceCaptureRegionStore.getState().cancel()}
        style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', padding: '4px 8px' }}
      >
        Cancel
      </button>
    </aside>
  )
}
