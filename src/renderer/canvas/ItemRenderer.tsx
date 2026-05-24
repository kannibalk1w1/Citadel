import React from 'react'
import { Group, Rect, Text } from 'react-konva'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { ItemErrorBoundary } from './ItemErrorBoundary'
import { ImageItem } from './items/ImageItem'
import { GifItem } from './items/GifItem'
import { VideoItem } from './items/VideoItem'
import { YouTubeItem } from './items/YouTubeItem'
import { AudioItem } from './items/AudioItem'
import { Model3DItem } from './items/Model3DItem'
import { StickyItem } from './items/StickyItem'
import { TextItem } from './items/TextItem'
import { SwatchItem } from './items/SwatchItem'
import { ComparisonItem } from './items/ComparisonItem'
import {
  chromeFrameStyle,
  connectedItemIds,
  frameVariant,
  frameVariantStyle,
  itemTypeBadge,
} from './overlays/boardChromeViewModel'

const DOM_TYPES = new Set(['video', 'youtube', 'audio', 'model3d'])

type Props = { item: CanvasItem }
type InnerProps = { item: CanvasItem; domOnly?: boolean }

function canvasToken(value: string): string {
  if (!value.startsWith('var(')) return value
  const token = value.slice(4, -1).trim()
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || '#bd9652'
}

function Inner({ item, domOnly = false }: InnerProps): React.ReactElement | null {
  switch (item.type) {
    case 'image':      return <ImageItem item={item} />
    case 'gif':        return <GifItem item={item} />
    case 'video':      return <VideoItem item={item} domOnly={domOnly} />
    case 'youtube':    return <YouTubeItem item={item} domOnly={domOnly} />
    case 'audio':      return <AudioItem item={item} domOnly={domOnly} />
    case 'model3d':    return <Model3DItem item={item} domOnly={domOnly} />
    case 'sticky':     return <StickyItem item={item} />
    case 'text':       return <TextItem item={item} />
    case 'swatch':     return <SwatchItem item={item} />
    case 'comparison': return <ComparisonItem item={item} />
    default:           return null
  }
}

export function ItemRenderer({ item }: Props): React.ReactElement | null {
  const viewport = useCanvasStore((s) => s.viewport())
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const connections = useCanvasStore((s) => s.connections())
  if (!item.visible) return null
  if (DOM_TYPES.has(item.type)) return null
  const isSelected = selectedIds.includes(item.id)
  const relatedIds = selectedIds.length === 1 ? connectedItemIds(selectedIds[0], connections) : new Set<string>()
  const isRelated = relatedIds.has(item.id)
  const frame = chromeFrameStyle({ selected: isSelected, locked: item.locked })
  const frameStroke = canvasToken(frame.stroke)
  const variant = frameVariantStyle(frameVariant(item))
  const badge = itemTypeBadge(item)
  const chromeFrame = (
    <>
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
          listening={false}
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
        listening={false}
      />
      {[
        [item.x - 2 / viewport.scale, item.y - 2 / viewport.scale, 1, 0],
        [item.x + item.width + 2 / viewport.scale, item.y - 2 / viewport.scale, -1, 0],
        [item.x - 2 / viewport.scale, item.y + item.height + 2 / viewport.scale, 1, -1],
        [item.x + item.width + 2 / viewport.scale, item.y + item.height + 2 / viewport.scale, -1, -1],
      ].map(([x, y, sx, sy], index) => (
        <Group key={index} x={x} y={y} rotation={item.rotation} listening={false} opacity={variant.lineOpacity}>
          <Rect x={sx < 0 ? -variant.cornerSize / viewport.scale : 0} y={0} width={variant.cornerSize / viewport.scale} height={1 / viewport.scale} fill={frameStroke} />
          <Rect x={0} y={sy < 0 ? -variant.cornerSize / viewport.scale : 0} width={1 / viewport.scale} height={variant.cornerSize / viewport.scale} fill={frameStroke} />
        </Group>
      ))}
      <Group x={item.x + 6 / viewport.scale} y={item.y - 12 / viewport.scale} rotation={item.rotation} listening={false}>
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
          listening={false}
        />
      </Group>
    </>
  )
  // Tint overlay for Konva items — DOM items handle tint inside DOMItem
  const tintRect = item.tint ? (
    <Rect
      x={item.x} y={item.y}
      width={item.width} height={item.height}
      rotation={item.rotation}
      fill={item.tint.color}
      opacity={item.tint.opacity}
      listening={false}
    />
  ) : null
  const lockMarker = item.locked ? (
    <Text
      x={item.x + item.width - 18 / viewport.scale}
      y={item.y + 4 / viewport.scale}
      text="🔒"
      fontSize={14 / viewport.scale}
      fill="#b99455"
      shadowEnabled
      shadowColor="rgba(0,0,0,0.85)"
      shadowBlur={4 / viewport.scale}
      listening={false}
    />
  ) : null
  return (
    <ItemErrorBoundary itemId={item.id} x={item.x} y={item.y} width={item.width} height={item.height}>
      <Group>
        <Inner item={item} />
        {tintRect}
        {chromeFrame}
        {lockMarker}
      </Group>
    </ItemErrorBoundary>
  )
}

export function DOMLayerItemRenderer({ item }: Props): React.ReactElement | null {
  if (!item.visible || !DOM_TYPES.has(item.type)) return null
  return <Inner item={item} domOnly />
}
