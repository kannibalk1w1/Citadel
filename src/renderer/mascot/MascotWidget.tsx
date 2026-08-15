import React, { useEffect, useState } from 'react'
import { useMascotStore, type MascotEffect } from '../store/mascotStore'

// Mascot: chess-rook tower SVG in the UI corner.
// Strict colour palette enforced — see CLAUDE.md.

export function MascotWidget(): React.ReactElement {
  const { effectQueue, persistentEffects, consumeNextEffect } = useMascotStore()
  const [currentEffect, setCurrentEffect] = useState<MascotEffect | null>(null)
  const [currentProgress, setCurrentProgress] = useState(0)

  // Dequeue and run the next effect
  useEffect(() => {
    if (currentEffect || effectQueue.length === 0) return
    const next = consumeNextEffect()
    if (!next) return
    setCurrentEffect(next.name)
    setCurrentProgress(next.progress ?? 0)
    // Effect lifetime: most effects play ~1.2s, then clear
    const timeout = setTimeout(() => setCurrentEffect(null), 1200)
    return () => clearTimeout(timeout)
  }, [effectQueue, currentEffect, consumeNextEffect])

  const hasPersistentEye = persistentEffects.has('eye-open')
  const hasEmber = persistentEffects.has('ember-drift')

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 120,
        width: 48,
        height: 56,
        zIndex: 50,
        cursor: 'grab',
        userSelect: 'none',
        filter: 'drop-shadow(0 0 6px rgba(80,80,80,0.5))',
      }}
      title="Citadel"
    >
      <svg
        viewBox="0 0 48 56"
        width={48}
        height={56}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Tower body */}
        <rect x="10" y="20" width="28" height="32" rx="2" fill="#0a0a0a" />

        {/* Battlements */}
        <rect x="8"  y="14" width="6" height="8" rx="1" fill="#0a0a0a" />
        <rect x="16" y="12" width="6" height="10" rx="1" fill="#0a0a0a" />
        <rect x="26" y="12" width="6" height="10" rx="1" fill="#0a0a0a" />
        <rect x="34" y="14" width="6" height="8" rx="1" fill="#0a0a0a" />

        {/* Gate arch */}
        <path d="M18 52 L18 40 Q24 34 30 40 L30 52 Z" fill="#1a1612" />

        {/* Eye (recording indicator) */}
        {hasPersistentEye && (
          <circle cx="24" cy="30" r="4" fill="#8b0000">
            <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Effect overlays */}
        {currentEffect === 'rune-seal' && <RuneSeal />}
        {currentEffect === 'lightning-out' && <Lightning direction="out" />}
        {currentEffect === 'lightning-in' && <Lightning direction="in" />}
        {currentEffect === 'base-pulse' && <BasePulse />}
        {currentEffect === 'crumble' && <Crumble />}
        {currentEffect === 'rise-from-fog' && <RiseFromFog />}
        {currentEffect === 'brightness-pulse' && <BrightnessPulse />}
        {currentEffect === 'rewind-swirl' && <RewindSwirl />}
        {currentEffect === 'forward-surge' && <ForwardSurge />}
        {currentEffect === 'lighthouse-beam' && <LighthouseBeam />}
        {currentEffect === 'fracture' && <Fracture />}
        {currentEffect === 'banner-raise' && <BannerRaise />}
        {currentEffect === 'eye-close' && <EyeClose />}
        {currentEffect === 'progress-fill' && <ProgressFill progress={currentProgress} />}

        {/* Ember drift (persistent idle) */}
        {hasEmber && <EmberDrift />}

        {/* Stone detail lines */}
        <line x1="10" y1="32" x2="38" y2="32" stroke="#2a2a2a" strokeWidth="0.5" />
        <line x1="10" y1="42" x2="38" y2="42" stroke="#2a2a2a" strokeWidth="0.5" />
        {/* Tower edge highlight */}
        <rect x="10" y="20" width="28" height="32" rx="2" fill="none" stroke="#505050" strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── Effect components ──────────────────────────────────────────────────────────

function RuneSeal(): React.ReactElement {
  return (
    <g>
      <circle cx="24" cy="36" r="10" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.7">
        <animate attributeName="r" values="6;12;6" dur="1.2s" fill="freeze" />
        <animate attributeName="opacity" values="0.7;0;0" dur="1.2s" fill="freeze" />
      </circle>
      <text x="24" y="40" textAnchor="middle" fontSize="8" fill="#c8c8c8" fontFamily="Cinzel" opacity="0.6">
        ⊕
        <animate attributeName="opacity" values="0.6;0;0" dur="1.2s" fill="freeze" />
      </text>
    </g>
  )
}

function Lightning({ direction }: { direction: 'in' | 'out' }): React.ReactElement {
  const y1 = direction === 'out' ? 20 : 56
  const y2 = direction === 'out' ? -10 : 20
  return (
    <line x1="24" y1={y1} x2="24" y2={y2} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 2">
      <animate attributeName="opacity" values="1;0.5;1;0" dur="0.8s" fill="freeze" />
    </line>
  )
}

function BasePulse(): React.ReactElement {
  return (
    <rect x="10" y="50" width="28" height="2" rx="1" fill="#c8c8c8">
      <animate attributeName="opacity" values="0;0.8;0" dur="0.6s" fill="freeze" />
    </rect>
  )
}

function Crumble(): React.ReactElement {
  return (
    <g>
      {[14, 20, 28, 34].map((x, i) => (
        <circle key={i} cx={x} cy={40} r="1.5" fill="#505050">
          <animateTransform attributeName="transform" type="translate" values={`0,0; ${(i - 1.5) * 4},${8 + i * 2}`} dur="1s" fill="freeze" />
          <animate attributeName="opacity" values="1;0" dur="1s" fill="freeze" />
        </circle>
      ))}
    </g>
  )
}

function RiseFromFog(): React.ReactElement {
  return (
    <rect x="0" y="56" width="48" height="20" fill="#2a2a2a">
      <animateTransform attributeName="transform" type="translate" values="0,0; 0,-60" dur="1.2s" fill="freeze" />
      <animate attributeName="opacity" values="0.8;0" dur="1.2s" fill="freeze" />
    </rect>
  )
}

function BrightnessPulse(): React.ReactElement {
  return (
    <rect x="8" y="12" width="32" height="44" rx="2" fill="#ffffff">
      <animate attributeName="opacity" values="0;0.3;0" dur="0.5s" fill="freeze" />
    </rect>
  )
}

function EmberDrift(): React.ReactElement {
  return (
    <g>
      {[18, 24, 30].map((x, i) => (
        <circle key={i} cx={x} cy={20} r="1" fill="#505050">
          <animate attributeName="cy" values="20;10;0" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.2;0" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

function RewindSwirl(): React.ReactElement {
  return (
    <g>
      <path d="M24 36 A8 8 0 1 0 16 28" fill="none" stroke="#c8c8c8" strokeWidth="1.2">
        <animate attributeName="opacity" values="0.8;0;0" dur="1.2s" fill="freeze" />
        <animateTransform attributeName="transform" type="rotate" from="0 24 34" to="-360 24 34" dur="1.2s" fill="freeze" />
      </path>
      <polygon points="14,25 14,31 18,28" fill="#c8c8c8">
        <animate attributeName="opacity" values="0.8;0;0" dur="1.2s" fill="freeze" />
      </polygon>
    </g>
  )
}

function ForwardSurge(): React.ReactElement {
  return (
    <g>
      <path d="M24 36 A8 8 0 1 1 32 28" fill="none" stroke="#ffffff" strokeWidth="1.2">
        <animate attributeName="opacity" values="0.8;0;0" dur="1.2s" fill="freeze" />
        <animateTransform attributeName="transform" type="rotate" from="0 24 34" to="360 24 34" dur="1.2s" fill="freeze" />
      </path>
      <polygon points="34,25 34,31 30,28" fill="#ffffff">
        <animate attributeName="opacity" values="0.8;0;0" dur="1.2s" fill="freeze" />
      </polygon>
    </g>
  )
}

function LighthouseBeam(): React.ReactElement {
  return (
    <g>
      <line x1="24" y1="18" x2="6" y2="-4" stroke="#ffffff" strokeWidth="1">
        <animate attributeName="opacity" values="0;0.7;0.7;0" dur="1.2s" fill="freeze" />
        <animateTransform attributeName="transform" type="rotate" from="-30 24 18" to="60 24 18" dur="1.2s" fill="freeze" />
      </line>
      <line x1="24" y1="18" x2="44" y2="-4" stroke="#c8c8c8" strokeWidth="0.8" opacity="0.4">
        <animate attributeName="opacity" values="0;0.4;0.4;0" dur="1.2s" fill="freeze" />
        <animateTransform attributeName="transform" type="rotate" from="-30 24 18" to="60 24 18" dur="1.2s" fill="freeze" />
      </line>
    </g>
  )
}

function ProgressFill({ progress }: { progress: number }): React.ReactElement {
  const fillH = Math.round(32 * Math.min(1, Math.max(0, progress)))
  return (
    <rect x="10" y={52 - fillH} width="28" height={fillH} rx="1" fill="#505050" opacity="0.6">
      <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.6s" repeatCount="indefinite" />
    </rect>
  )
}

function Fracture(): React.ReactElement {
  return (
    <g>
      <path d="M20 20 L23 28 L19 32 L24 40 L27 34 L31 36 L28 28 L32 22" fill="none" stroke="#5a0000" strokeWidth="1">
        <animate attributeName="opacity" values="0;1;1;0" dur="1.2s" fill="freeze" />
      </path>
      <path d="M16 24 L22 30" fill="none" stroke="#5a0000" strokeWidth="0.7" opacity="0.6">
        <animate attributeName="opacity" values="0;0.6;0.6;0" dur="1.2s" fill="freeze" />
      </path>
      <path d="M30 32 L26 38" fill="none" stroke="#5a0000" strokeWidth="0.7" opacity="0.6">
        <animate attributeName="opacity" values="0;0.6;0.6;0" dur="1.2s" fill="freeze" />
      </path>
    </g>
  )
}

function BannerRaise(): React.ReactElement {
  return (
    <g>
      <line x1="36" y1="20" x2="36" y2="10" stroke="#c8c8c8" strokeWidth="0.8">
        <animate attributeName="opacity" values="0;0.8;0.8;0" dur="1.2s" fill="freeze" />
      </line>
      <rect x="36" y="10" width="10" height="6" rx="1" fill="#505050">
        <animateTransform attributeName="transform" type="translate" values="0,8; 0,0" dur="0.5s" fill="freeze" />
        <animate attributeName="opacity" values="0;0.9;0.9;0" dur="1.2s" fill="freeze" />
      </rect>
    </g>
  )
}

function EyeClose(): React.ReactElement {
  return (
    <g>
      <circle cx="24" cy="30" r="4" fill="#8b0000">
        <animate attributeName="ry" values="4;0.5;0" dur="0.4s" fill="freeze" />
        <animate attributeName="opacity" values="1;1;0" dur="0.4s" fill="freeze" />
      </circle>
      <line x1="20" y1="30" x2="28" y2="30" stroke="#0a0a0a" strokeWidth="1.5">
        <animate attributeName="opacity" values="0;0;1" dur="0.4s" fill="freeze" />
      </line>
    </g>
  )
}
