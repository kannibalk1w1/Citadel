import React, { useMemo } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useCanvasEffectStore } from './effects/canvasEffectStore'
import { ambienceElements } from './chamberAmbienceModel'
import { resolveChamberIdentity } from './chamberIdentity'

// Chamber atmosphere: a fixed-budget DOM/CSS layer between the canvas floor
// and the Konva stage. It never touches relics, the spatial index, or the
// viewport slice, so it cannot wake dormant media.
export function ChamberAmbience(): React.ReactElement | null {
  const activeBoard = useCanvasStore((s) => s.boards.find((b) => b.id === s.activeBoardId) ?? null)
  const reducedMotion = useCanvasEffectStore((s) => s.reducedMotion)

  const identity = activeBoard ? resolveChamberIdentity(activeBoard) : null

  const elements = useMemo(
    () => (identity ? ambienceElements(identity.ambience, identity.ambienceIntensity, reducedMotion) : []),
    [identity?.ambience, identity?.ambienceIntensity, reducedMotion],
  )

  if (!identity) return null
  const showLighting = identity.vignette > 0 || identity.glow > 0
  if (elements.length === 0 && !showLighting) return null

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        .chamber-mote {
          position: absolute;
          border-radius: 50%;
          background: var(--chamber-accent-glow, var(--effect-mid));
          animation: chamber-mote-drift linear infinite;
        }
        .chamber-fog-band {
          position: absolute;
          left: -30%;
          width: 160%;
          height: 34%;
          background: linear-gradient(90deg, transparent, var(--chamber-accent-dim, var(--effect-dim)), transparent);
          filter: blur(46px);
          animation: chamber-fog-pan linear infinite alternate;
        }
        .chamber-static-wash {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 62%, var(--chamber-accent-dim, var(--effect-dim)), transparent 68%);
        }
        @keyframes chamber-mote-drift {
          0%   { transform: translate3d(0, 0, 0); }
          25%  { transform: translate3d(14px, -26px, 0); }
          50%  { transform: translate3d(-8px, -52px, 0); }
          75%  { transform: translate3d(10px, -78px, 0); }
          100% { transform: translate3d(0, -104px, 0); opacity: 0; }
        }
        @keyframes chamber-fog-pan {
          from { transform: translate3d(-6%, 0, 0); }
          to   { transform: translate3d(6%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .chamber-mote, .chamber-fog-band { animation: none; }
        }
      `}</style>
      {elements.map((element, index) => (
        <span
          key={`${element.kind}-${index}`}
          className={`chamber-${element.kind === 'fog-band' ? 'fog-band' : element.kind === 'static-wash' ? 'static-wash' : 'mote'}`}
          style={{
            left: `${element.leftPct}%`,
            top: `${element.topPct}%`,
            width: element.kind === 'mote' ? element.sizePx : undefined,
            height: element.kind === 'mote' ? element.sizePx : undefined,
            opacity: element.opacity,
            animationDuration: `${element.durationMs}ms`,
            animationDelay: `${element.delayMs}ms`,
          }}
        />
      ))}
      {identity.vignette > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 48%, transparent 52%, #030506 130%)',
            opacity: identity.vignette,
          }}
        />
      )}
      {identity.glow > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 66%, var(--chamber-accent-dim, var(--effect-dim)), transparent 62%)',
            opacity: identity.glow * 0.35,
          }}
        />
      )}
    </div>
  )
}
