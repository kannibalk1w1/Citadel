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

function FlameTongues({ effect }: { effect: ActiveCanvasEffect }): React.ReactElement {
  const tongues = effect.kind === 'import-yellow-spark' ? 5 : 7
  return (
    <>
      {Array.from({ length: tongues }, (_, index) => {
        const angle = (index / tongues) * Math.PI * 2
        const distance = 18 + (index % 3) * 9
        const dx = Math.cos(angle) * distance
        const dy = Math.sin(angle) * distance * 0.58
        return (
          <i
            key={index}
            className="canvas-breach-tongue"
            style={{
              '--breach-dx': `${dx}px`,
              '--breach-dy': `${dy}px`,
              '--breach-delay': `${index * 48}ms`,
            } as React.CSSProperties}
          />
        )
      })}
    </>
  )
}

export function CanvasEffectLayer({ viewport, width, height }: CanvasEffectLayerProps): React.ReactElement {
  const activeEffects = useCanvasEffectStore((state) => state.activeEffects)
  const lastCanvasPointer = useCanvasEffectStore((state) => state.lastCanvasPointer)
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
          width: calc(86px * var(--breach-intensity));
          height: calc(58px * var(--breach-intensity));
          transform: translate(-50%, -50%);
          opacity: 0;
          animation: canvasBreachFade var(--breach-life) ease-out forwards;
          filter: saturate(1.2);
        }

        .canvas-breach-core,
        .canvas-breach-glow,
        .canvas-breach-fracture,
        .canvas-breach-ash {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }

        .canvas-breach-glow {
          background:
            radial-gradient(ellipse at 50% 58%, color-mix(in srgb, var(--breach-color) 55%, transparent), transparent 64%),
            radial-gradient(ellipse at 50% 62%, color-mix(in srgb, var(--breach-secondary) 28%, transparent), transparent 72%);
          filter: blur(8px);
          animation: canvasBreachGlow var(--breach-life) ease-out forwards;
        }

        .canvas-breach-core {
          width: 48%;
          height: 26%;
          left: 26%;
          top: 42%;
          background:
            radial-gradient(ellipse at 50% 70%, var(--breach-secondary), transparent 28%),
            radial-gradient(ellipse at 50% 40%, var(--breach-color), transparent 62%);
          box-shadow: 0 0 18px color-mix(in srgb, var(--breach-color) 72%, transparent);
          animation: canvasBreachCore var(--breach-life) cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        .canvas-breach-tongue {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 20px;
          height: 5px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--breach-secondary), var(--breach-color), transparent);
          box-shadow: 0 0 10px var(--breach-color);
          opacity: 0;
          transform: translate(-50%, -50%);
          animation: canvasBreachTongue var(--breach-life) cubic-bezier(0.15, 0.85, 0.2, 1) forwards;
          animation-delay: var(--breach-delay);
        }

        .canvas-breach-fracture {
          opacity: 0.85;
          background:
            linear-gradient(23deg, transparent 42%, var(--breach-color) 43%, transparent 45%),
            linear-gradient(151deg, transparent 48%, var(--breach-secondary) 49%, transparent 51%),
            linear-gradient(96deg, transparent 52%, var(--breach-color) 53%, transparent 55%);
          mask-image: radial-gradient(ellipse at center, black 0 48%, transparent 74%);
          animation: canvasBreachFracture var(--breach-life) ease-out forwards;
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

        .canvas-breach-import .canvas-breach-tongue,
        .canvas-breach-export .canvas-breach-tongue {
          height: 3px;
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
          0% { transform: scale(0.35); opacity: 0; }
          18% { transform: scale(1.05); opacity: 0.85; }
          100% { transform: scale(1.85); opacity: 0; }
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

        @keyframes canvasBreachTongue {
          0% { opacity: 0; transform: translate(-50%, -50%) scaleX(0.2); }
          20% { opacity: 0.9; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--breach-dx)), calc(-50% + var(--breach-dy))) scaleX(1.45); }
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
            <span className="canvas-breach-fracture" />
            <span className="canvas-breach-core" />
            <span className="canvas-breach-ash" />
            <FlameTongues effect={effect} />
          </div>
        )
      })}
    </div>
  )
}
