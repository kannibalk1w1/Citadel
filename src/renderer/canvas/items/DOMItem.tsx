// Shared wrapper for DOM-layer items (video, youtube, audio, model3d).
// Renders children as an absolutely-positioned div synced to canvas coordinates.
import React, { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { canvasToScreen } from '../../../types'

type Props = {
  item: CanvasItem
  children: React.ReactNode
  style?: React.CSSProperties
}

// Mount point for all DOM items
let domLayer = document.getElementById('dom-items-layer')
if (!domLayer) {
  domLayer = document.createElement('div')
  domLayer.id = 'dom-items-layer'
  domLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:var(--z-dom-items,10);'
  document.getElementById('root')?.appendChild(domLayer)
}

export function DOMItem({ item, children, style }: Props): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = canvasToScreen(item, viewport)
    ref.current.style.left = `${rect.left}px`
    ref.current.style.top = `${rect.top}px`
    ref.current.style.width = `${rect.width}px`
    ref.current.style.height = `${rect.height}px`
    ref.current.style.transform = `rotate(${item.rotation}deg)`
  })

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'absolute',
        transformOrigin: 'top left',
        opacity: item.opacity,
        pointerEvents: 'auto',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
      {item.tint && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: item.tint.color,
          opacity: item.tint.opacity,
          mixBlendMode: 'multiply',
        }} />
      )}
      {item.locked && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            color: '#b99455',
            fontSize: 14,
            lineHeight: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.85)',
            pointerEvents: 'none',
          }}
        >
          🔒
        </div>
      )}
    </div>,
    domLayer!
  )
}
