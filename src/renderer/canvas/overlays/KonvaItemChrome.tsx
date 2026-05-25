import React from 'react'
import { Group, Rect, Text } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import {
  chromeFrameStyle,
  connectedItemIds,
  frameVariant,
  frameVariantStyle,
  itemTypeBadge,
} from './boardChromeViewModel'

const DOM_TYPES = new Set(['video', 'youtube', 'audio', 'model3d'])

function canvasToken(value: string): string {
  if (!value.startsWith('var(')) return value
  const token = value.slice(4, -1).trim()
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || '#bd9652'
}

function ItemChrome({ item }: { item: CanvasItem }): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const connections = useCanvasStore((s) => s.connections())
  const isSelected = selectedIds.includes(item.id)
  const relatedIds = selectedIds.length === 1 ? connectedItemIds(selectedIds[0], connections) : new Set<string>()
  const isRelated = relatedIds.has(item.id)
  const frame = chromeFrameStyle({ selected: isSelected, locked: item.locked })
  const frameStroke = canvasToken(frame.stroke)
  const variant = frameVariantStyle(frameVariant(item))
  const badge = itemTypeBadge(item)

  return (
    <Group data-testid="konva-item-chrome" listening={false}>
      {(frame.glowOpacity > 0 || isRelated) && (
        <Rect
          x={item.x - 4 / viewport.scale}
          y={item.y - 4 / viewport.scale}
          width={item.width + 8 / viewport.scale}
          height={item.height + 8 / viewport.scale}
          rotation={item.rotation}
          stroke={isRelated && !isSelected ? 'rgba(189,150,82,0.52)' : canvasToken('var(--accent)')}
          strokeWidth={3 / viewport.scale}
          opacity={isRelated && !isSelected ? 0.18 : frame.glowOpacity}
          cornerRadius={2 / viewport.scale}
        />
      )}
      <Rect
        x={item.x - 2 / viewport.scale}
        y={item.y - 2 / viewport.scale}
        width={item.width + 4 / viewport.scale}
        height={item.height + 4 / viewport.scale}
        rotation={item.rotation}
        stroke={frameStroke}
        strokeWidth={frame.strokeWidth / viewport.scale}
        dash={frame.dash?.map((n) => n / viewport.scale)}
        cornerRadius={2 / viewport.scale}
      />
      {[
        [item.x - 2 / viewport.scale, item.y - 2 / viewport.scale, 1, 0],
        [item.x + item.width + 2 / viewport.scale, item.y - 2 / viewport.scale, -1, 0],
        [item.x - 2 / viewport.scale, item.y + item.height + 2 / viewport.scale, 1, -1],
        [item.x + item.width + 2 / viewport.scale, item.y + item.height + 2 / viewport.scale, -1, -1],
      ].map(([x, y, sx, sy], index) => (
        <Group key={index} x={x} y={y} rotation={item.rotation} opacity={variant.lineOpacity}>
          <Rect x={sx < 0 ? -variant.cornerSize / viewport.scale : 0} y={0} width={variant.cornerSize / viewport.scale} height={1 / viewport.scale} fill={frameStroke} />
          <Rect x={0} y={sy < 0 ? -variant.cornerSize / viewport.scale : 0} width={1 / viewport.scale} height={variant.cornerSize / viewport.scale} fill={frameStroke} />
        </Group>
      ))}
      <Group x={item.x + 6 / viewport.scale} y={item.y - 12 / viewport.scale} rotation={item.rotation}>
        <Rect
          width={Math.max(26, badge.length * 8) / viewport.scale}
          height={14 / viewport.scale}
          fill={variant.badgeFill}
          stroke={frameStroke}
          strokeWidth={0.75 / viewport.scale}
          cornerRadius={2 / viewport.scale}
        />
        <Text
          x={4 / viewport.scale}
          y={2 / viewport.scale}
          text={badge}
          fill="#e0d6c7"
          fontSize={8 / viewport.scale}
          fontFamily="JetBrains Mono"
        />
      </Group>
    </Group>
  )
}

type KonvaItemChromeProps = {
  items?: CanvasItem[]
}

export function KonvaItemChrome({ items: providedItems }: KonvaItemChromeProps = {}): React.ReactElement | null {
  const storeItems = useCanvasStore((s) => s.items())
  const items = providedItems ?? storeItems
  const visibleKonvaItems = items.filter((item) => item.visible && !DOM_TYPES.has(item.type))
  if (visibleKonvaItems.length === 0) return null
  return (
    <>
      {visibleKonvaItems.map((item) => (
        <ItemChrome key={item.id} item={item} />
      ))}
    </>
  )
}
