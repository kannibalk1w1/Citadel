import React, { useRef, useEffect } from 'react'
import { engine } from './HyperTypeEngine'

const STYLES = `
@keyframes htFloat {
  0%   { transform: translateY(0);     opacity: 1; }
  100% { transform: translateY(-40px); opacity: 0; }
}
.ht-shake-light {
  animation: htShakeLight 80ms ease both;
}
.ht-shake-medium {
  animation: htShakeMedium 120ms ease both;
}
@keyframes htShakeLight {
  0%,100% { transform: translate(0,0); }
  25%     { transform: translate(-2px,1px); }
  75%     { transform: translate(2px,-1px); }
}
@keyframes htShakeMedium {
  0%,100% { transform: translate(0,0); }
  25%     { transform: translate(-4px,2px); }
  75%     { transform: translate(4px,-2px); }
}
`

type Props = { canvasContainerRef: React.RefObject<HTMLDivElement> }

export function HyperTypeOverlay({ canvasContainerRef }: Props): React.ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (overlayRef.current) engine.setOverlay(overlayRef.current)
  }, [])

  useEffect(() => {
    if (canvasContainerRef.current) engine.setCanvasContainer(canvasContainerRef.current)
  }, [canvasContainerRef])

  return (
    <>
      <style>{STYLES}</style>
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9998,
          overflow: 'hidden',
        }}
      />
    </>
  )
}
