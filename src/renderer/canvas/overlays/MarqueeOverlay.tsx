import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Rect } from 'react-konva'
import type Konva from 'konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { canvasColor } from '../../theme/canvasColors'
import { consumeMarqueeSweep, itemsInMarquee, markMarqueeSweep, marqueeIsLive, marqueeRect, type MarqueeRect } from './marqueeSelection'

type Props = { stage: Konva.Stage | null }

/**
 * Rubber-band selection on the Select tool: press empty ground and sweep.
 *
 * Deliberately not the Lasso tool, which lays a transparent Rect over the whole
 * screen and so has to be a mode of its own. This listens on the Stage and only
 * starts when the press landed on the Stage itself, so relics keep every one of
 * their own interactions.
 */
export function MarqueeOverlay({ stage }: Props): React.ReactElement | null {
  const toolMode = useUIStore((s) => s.toolMode)
  const viewport = useCanvasStore((s) => s.viewport())
  const [rect, setRect] = useState<MarqueeRect | null>(null)
  // The mouseup handler is registered once per tool change but needs the rect
  // as it stood at release, so it reads this rather than a stale closure.
  const rectRef = useRef<MarqueeRect | null>(null)
  rectRef.current = rect
  const anchor = useRef<{ x: number; y: number } | null>(null)
  const additive = useRef(false)
  // Read imperatively during the sweep: viewport and items both change under it.
  const vp = useRef(viewport)
  vp.current = viewport

  const toCanvas = useCallback((sx: number, sy: number) => ({
    x: (sx - vp.current.x) / vp.current.scale,
    y: (sy - vp.current.y) / vp.current.scale,
  }), [])

  useEffect(() => {
    if (!stage || toolMode !== 'select') return undefined

    const onDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only empty ground, and only the primary button — right-click opens the
      // context menu and middle-drag pans.
      if (e.target !== stage || e.evt.button !== 0) return
      consumeMarqueeSweep()
      const pos = stage.getPointerPosition()
      if (!pos) return
      anchor.current = toCanvas(pos.x, pos.y)
      additive.current = e.evt.shiftKey
    }

    const onMove = () => {
      if (!anchor.current) return
      const pos = stage.getPointerPosition()
      if (!pos) return
      setRect(marqueeRect(anchor.current, toCanvas(pos.x, pos.y)))
    }

    const onUp = () => {
      const start = anchor.current
      const swept = rectRef.current
      anchor.current = null
      setRect(null)
      // A press that never travelled is a click: the Stage's own handler owns
      // it, and clearing the selection there is what "click off" means.
      if (!start || !swept || !marqueeIsLive(swept, vp.current)) return
      markMarqueeSweep()
      const ids = itemsInMarquee(useCanvasStore.getState().items(), swept)
      if (additive.current) ids.forEach((id) => useCanvasStore.getState().addToSelection(id))
      else useCanvasStore.getState().setSelection(ids)
    }

    stage.on('mousedown.marquee', onDown)
    stage.on('mousemove.marquee', onMove)
    // On the window, not the stage: a sweep that ends off-canvas still has to end.
    window.addEventListener('mouseup', onUp)
    return () => {
      stage.off('mousedown.marquee')
      stage.off('mousemove.marquee')
      window.removeEventListener('mouseup', onUp)
      anchor.current = null
      setRect(null)
    }
  }, [stage, toolMode, toCanvas])

  if (!rect || !marqueeIsLive(rect, viewport)) return null

  const unit = 1 / Math.max(0.05, viewport.scale)
  return (
    <Rect
      x={rect.x} y={rect.y} width={rect.width} height={rect.height}
      stroke={canvasColor('accent')}
      strokeWidth={1 * unit}
      dash={[4 * unit, 3 * unit]}
      fill={canvasColor('accentSoft')}
      listening={false}
    />
  )
}
