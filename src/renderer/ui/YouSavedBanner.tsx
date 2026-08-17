import React from 'react'
import { useUIStore } from '../store/uiStore'
import { canvasColor } from '../theme/canvasColors'

const STYLE = `
@keyframes youSavedAnim {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}
`

export function YouSavedBanner(): React.ReactElement | null {
  const visible = useUIStore((s) => s.youSavedVisible)
  const hideYouSaved = useUIStore((s) => s.hideYouSaved)

  if (!visible) return null

  return (
    <>
      <style>{STYLE}</style>
      <div
        onAnimationEnd={hideYouSaved}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          background: 'rgba(0, 0, 0, 0.70)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'youSavedAnim 2.5s ease-in-out forwards',
        }}
      >
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: 52,
            color: canvasColor("accent"),
            letterSpacing: '0.18em',
            textShadow: '0 0 40px rgba(185,148,85,0.55), 0 0 80px rgba(185,148,85,0.25)',
            userSelect: 'none',
          }}
        >
          YOU SAVED
        </span>
      </div>
    </>
  )
}
