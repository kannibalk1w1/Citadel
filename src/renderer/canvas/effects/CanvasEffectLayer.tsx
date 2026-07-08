import React, { useEffect } from 'react'
import type { Viewport } from '../../../types'
import { resolveCanvasEffectSource } from './canvasEffectModel'
import { useCanvasEffectStore, type ActiveCanvasEffect } from './canvasEffectStore'

type CanvasEffectLayerProps = {
  viewport: Viewport
  width: number
  height: number
}

function toScreen(point: { x: number; y: number }, viewport: Viewport): { x: number; y: number } {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  }
}

function ArcParticles({ effect }: { effect: ActiveCanvasEffect }): React.ReactElement {
  const particles = effect.motif === 'gold-particle-ring' ? 16 : 10
  return (
    <>
      {Array.from({ length: particles }, (_, index) => {
        const angle = (index / particles) * Math.PI * 2
        const distance = 34 + (index % 4) * 10
        const dx = Math.cos(angle) * distance
        const dy = Math.sin(angle) * distance * 0.48
        return (
          <i
            key={index}
            className="canvas-breach-particle"
            style={{
              '--breach-dx': `${dx}px`,
              '--breach-dy': `${dy}px`,
              '--breach-delay': `${index * 26}ms`,
            } as React.CSSProperties}
          />
        )
      })}
    </>
  )
}

function FlameArcs(): React.ReactElement {
  return (
    <>
      <span className="canvas-breach-arc canvas-breach-arc-a" />
      <span className="canvas-breach-arc canvas-breach-arc-b" />
      <span className="canvas-breach-arc canvas-breach-arc-c" />
    </>
  )
}

export function CanvasEffectLayer({ viewport, width, height }: CanvasEffectLayerProps): React.ReactElement {
  const activeEffects = useCanvasEffectStore((state) => state.activeEffects)
  // Pointer moves update the store constantly; only re-render for them while
  // effects are actually on screen.
  const lastCanvasPointer = useCanvasEffectStore((state) =>
    state.activeEffects.length === 0 ? null : state.lastCanvasPointer
  )
  const pruneExpired = useCanvasEffectStore((state) => state.pruneExpired)

  useEffect(() => {
    if (activeEffects.length === 0) return undefined
    const interval = window.setInterval(() => pruneExpired(), 120)
    return () => window.clearInterval(interval)
  }, [activeEffects.length, pruneExpired])

  return (
    <div className="canvas-effect-layer" aria-hidden="true">
      <style>{`
        .canvas-effect-layer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          mix-blend-mode: screen;
        }

        .canvas-breach {
          position: absolute;
          width: calc(148px * var(--breach-intensity));
          height: calc(112px * var(--breach-intensity));
          transform: translate(-50%, -50%);
          opacity: 0;
          animation: canvasBreachFade var(--breach-life) ease-out forwards;
          filter: saturate(1.45) contrast(1.08);
        }

        .canvas-breach-core,
        .canvas-breach-glow,
        .canvas-breach-fracture,
        .canvas-breach-ash,
        .canvas-breach-ring,
        .canvas-breach-ring-secondary,
        .canvas-breach-slash {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }

        .canvas-breach-glow {
          background:
            radial-gradient(ellipse at 50% 54%, color-mix(in srgb, var(--breach-color) 62%, transparent), transparent 54%),
            radial-gradient(ellipse at 50% 62%, color-mix(in srgb, var(--breach-secondary) 36%, transparent), transparent 74%);
          filter: blur(12px);
          animation: canvasBreachGlow var(--breach-life) ease-out forwards;
        }

        .canvas-breach-ring,
        .canvas-breach-ring-secondary {
          inset: 18%;
          border: 2px solid var(--breach-color);
          border-left-color: transparent;
          border-bottom-color: color-mix(in srgb, var(--breach-secondary) 70%, transparent);
          box-shadow:
            0 0 14px var(--breach-color),
            inset 0 0 18px color-mix(in srgb, var(--breach-secondary) 38%, transparent);
          transform: rotate(-18deg) scale(0.4);
          animation: canvasBreachRing var(--breach-life) cubic-bezier(0.12, 0.86, 0.2, 1) forwards;
        }

        .canvas-breach-ring-secondary {
          inset: 27%;
          border-width: 1px;
          animation-name: canvasBreachRingReverse;
          animation-duration: calc(var(--breach-life) * 0.92);
        }

        .canvas-breach-core {
          width: 42%;
          height: 36%;
          left: 29%;
          top: 32%;
          background:
            radial-gradient(ellipse at 50% 70%, var(--breach-secondary), transparent 28%),
            radial-gradient(ellipse at 50% 40%, var(--breach-color), transparent 62%);
          box-shadow: 0 0 24px color-mix(in srgb, var(--breach-color) 82%, transparent);
          animation: canvasBreachCore var(--breach-life) cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        .canvas-breach-arc {
          position: absolute;
          left: 19%;
          top: 28%;
          width: 62%;
          height: 45%;
          border-radius: 999px;
          border-top: 3px solid var(--breach-secondary);
          border-right: 2px solid var(--breach-color);
          border-left: 1px solid transparent;
          border-bottom: 1px solid transparent;
          box-shadow: 0 -4px 16px color-mix(in srgb, var(--breach-color) 70%, transparent);
          opacity: 0;
          transform: rotate(0deg) scale(0.5);
          animation: canvasBreachArc var(--breach-life) cubic-bezier(0.12, 0.86, 0.2, 1) forwards;
        }

        .canvas-breach-arc-b {
          transform: rotate(122deg) scale(0.5);
          animation-delay: 52ms;
        }

        .canvas-breach-arc-c {
          transform: rotate(244deg) scale(0.5);
          animation-delay: 96ms;
        }

        .canvas-breach-particle {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--breach-secondary);
          box-shadow: 0 0 12px var(--breach-color), 0 0 4px #fff;
          opacity: 0;
          transform: translate(-50%, -50%);
          animation: canvasBreachParticle var(--breach-life) cubic-bezier(0.15, 0.85, 0.2, 1) forwards;
          animation-delay: var(--breach-delay);
        }

        .canvas-breach-fracture {
          opacity: 0.65;
          background:
            linear-gradient(23deg, transparent 42%, var(--breach-color) 43%, transparent 45%),
            linear-gradient(151deg, transparent 48%, var(--breach-secondary) 49%, transparent 51%),
            linear-gradient(96deg, transparent 52%, var(--breach-color) 53%, transparent 55%);
          mask-image: radial-gradient(ellipse at center, black 0 48%, transparent 74%);
          animation: canvasBreachFracture var(--breach-life) ease-out forwards;
        }

        .canvas-breach-slash {
          inset: 6% 22%;
          border-radius: 0;
          background:
            linear-gradient(135deg, transparent 43%, var(--breach-secondary) 45%, var(--breach-color) 51%, transparent 56%),
            linear-gradient(45deg, transparent 48%, color-mix(in srgb, var(--breach-color) 70%, transparent) 50%, transparent 54%);
          filter: drop-shadow(0 0 10px var(--breach-color));
          opacity: 0;
          animation: canvasBreachSlash var(--breach-life) ease-out forwards;
        }

        .canvas-breach-ash {
          background:
            radial-gradient(circle at 22% 52%, color-mix(in srgb, var(--breach-color) 58%, #050707), transparent 5%),
            radial-gradient(circle at 68% 46%, color-mix(in srgb, var(--breach-color) 48%, #050707), transparent 4%),
            radial-gradient(circle at 55% 68%, #0a0d0d, transparent 5%);
          opacity: 0;
          animation: canvasBreachAsh var(--breach-life) ease-out forwards;
        }

        .canvas-breach-delete .canvas-breach-core {
          height: 32%;
          animation-name: canvasBreachCollapse;
        }

        .canvas-breach-import .canvas-breach-core {
          width: 24%;
          height: 24%;
          left: 38%;
          top: 38%;
        }

        .canvas-breach-sigil .canvas-breach-ring,
        .canvas-breach-sigil .canvas-breach-ring-secondary,
        .canvas-breach-sigil .canvas-breach-core {
          opacity: 0;
        }

        .canvas-breach-sigil .canvas-breach-slash {
          opacity: 1;
        }

        .canvas-breach-autosave {
          filter: saturate(0.85);
        }

        .canvas-breach-recording {
          animation: canvasBreachRecording 1800ms ease-in-out infinite;
        }

        @keyframes canvasBreachFade {
          0% { opacity: 0; }
          10% { opacity: 0.96; }
          70% { opacity: 0.82; }
          100% { opacity: 0; }
        }

        @keyframes canvasBreachGlow {
          0% { transform: scale(0.25); opacity: 0; }
          16% { transform: scale(1.05); opacity: 0.95; }
          100% { transform: scale(2.25); opacity: 0; }
        }

        @keyframes canvasBreachRing {
          0% { opacity: 0; transform: rotate(-40deg) scale(0.25); }
          14% { opacity: 1; }
          64% { opacity: 0.9; transform: rotate(300deg) scale(1.08); }
          100% { opacity: 0; transform: rotate(460deg) scale(1.45); }
        }

        @keyframes canvasBreachRingReverse {
          0% { opacity: 0; transform: rotate(50deg) scale(0.18); }
          18% { opacity: 0.85; }
          100% { opacity: 0; transform: rotate(-360deg) scale(1.2); }
        }

        @keyframes canvasBreachCore {
          0% { transform: scaleX(0.2) scaleY(0.6); opacity: 0; }
          18% { transform: scaleX(1.1) scaleY(1); opacity: 1; }
          100% { transform: scaleX(1.9) scaleY(0.42); opacity: 0; }
        }

        @keyframes canvasBreachCollapse {
          0% { transform: scale(0.4); opacity: 0; }
          18% { transform: scale(1.15); opacity: 1; }
          58% { transform: scale(0.72); opacity: 0.9; }
          100% { transform: scale(0.08); opacity: 0; }
        }

        @keyframes canvasBreachArc {
          0% { opacity: 0; transform: rotate(0deg) scale(0.3); }
          18% { opacity: 0.95; }
          100% { opacity: 0; transform: rotate(250deg) scale(1.28); }
        }

        @keyframes canvasBreachParticle {
          0% { opacity: 0; transform: translate(-50%, -50%) scaleX(0.2); }
          20% { opacity: 0.9; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--breach-dx)), calc(-50% + var(--breach-dy))) scale(0.6); }
        }

        @keyframes canvasBreachFracture {
          0% { opacity: 0; transform: scale(0.3); }
          20% { opacity: 0.72; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }

        @keyframes canvasBreachAsh {
          45% { opacity: 0; transform: scale(0.9); }
          68% { opacity: 0.65; }
          100% { opacity: 0; transform: scale(1.55); }
        }

        @keyframes canvasBreachSlash {
          0% { opacity: 0; transform: rotate(-10deg) scale(0.4); }
          18% { opacity: 1; transform: rotate(-10deg) scale(1); }
          100% { opacity: 0; transform: rotate(-10deg) scale(1.35); }
        }

        @keyframes canvasBreachRecording {
          0%, 100% { opacity: 0.24; transform: translate(-50%, -50%) scale(0.86); }
          50% { opacity: 0.48; transform: translate(-50%, -50%) scale(1.08); }
        }
      `}</style>
      {activeEffects.map((effect) => {
        const source = resolveCanvasEffectSource({
          target: effect.source,
          lastPointer: lastCanvasPointer,
          viewport,
          size: { width, height },
        })
        const screen = toScreen(source, viewport)
        return (
          <div
            key={effect.id}
            className={`canvas-breach ${effect.className}`}
            style={{
              left: screen.x,
              top: screen.y,
              '--breach-color': effect.color,
              '--breach-secondary': effect.secondaryColor,
              '--breach-life': `${effect.lifetimeMs}ms`,
              '--breach-intensity': effect.intensity,
            } as React.CSSProperties}
          >
            <span className="canvas-breach-glow" />
            <span className="canvas-breach-ring" />
            <span className="canvas-breach-ring-secondary" />
            <span className="canvas-breach-fracture" />
            <span className="canvas-breach-slash" />
            <span className="canvas-breach-core" />
            <span className="canvas-breach-ash" />
            <FlameArcs />
            <ArcParticles effect={effect} />
          </div>
        )
      })}
    </div>
  )
}
