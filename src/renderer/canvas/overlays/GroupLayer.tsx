import React from 'react'
import type { Viewport } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { visibleGroupIds } from './overlayVisibility'

type Props = {
  viewport: Viewport
  visibleItemIds?: ReadonlySet<string>
}

export function GroupLayer({ viewport, visibleItemIds }: Props): React.ReactElement {
  const items = useCanvasStore((s) => s.items())
  const renderGroupIds = visibleItemIds ? visibleGroupIds(items, visibleItemIds) : null

  const groups = new Map<string, typeof items>()
  for (const item of items) {
    if (!item.groupId) continue
    if (renderGroupIds && !renderGroupIds.has(item.groupId)) continue
    if (!groups.has(item.groupId)) groups.set(item.groupId, [])
    groups.get(item.groupId)!.push(item)
  }

  if (groups.size === 0) return <></>

  const PAD = 6

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
    >
      {Array.from(groups.entries()).map(([gid, members]) => {
        const minX = Math.min(...members.map((i) => i.x))
        const minY = Math.min(...members.map((i) => i.y))
        const maxX = Math.max(...members.map((i) => i.x + i.width))
        const maxY = Math.max(...members.map((i) => i.y + i.height))
        const sx = (minX - PAD) * viewport.scale + viewport.x
        const sy = (minY - PAD) * viewport.scale + viewport.y
        const sw = (maxX - minX + PAD * 2) * viewport.scale
        const sh = (maxY - minY + PAD * 2) * viewport.scale
        return (
          <rect
            key={gid}
            x={sx} y={sy}
            width={sw} height={sh}
            fill="none"
            stroke="#b99455"
            strokeWidth={1}
            strokeDasharray="5 4"
            strokeOpacity={0.4}
            rx={3}
          />
        )
      })}
    </svg>
  )
}
