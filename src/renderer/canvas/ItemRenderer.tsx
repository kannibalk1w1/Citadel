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
import { CodeItem } from './items/CodeItem'
import { canvasColor } from '../theme/canvasColors'

const DOM_TYPES = new Set(['video', 'youtube', 'audio', 'model3d', 'code'])

export function isDOMLayerItem(item: CanvasItem): boolean {
  return DOM_TYPES.has(item.type)
}

type Props = { item: CanvasItem }
type InnerProps = { item: CanvasItem; domOnly?: boolean }

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
    case 'code':       return <CodeItem item={item} domOnly={domOnly} />
    default:           return null
  }
}

export const ItemRenderer = React.memo(function ItemRenderer({ item }: Props): React.ReactElement | null {
  // Scale only sizes the lock marker; unlocked items don't need viewport at all,
  // so pan/zoom frames skip re-rendering them (Stage transform handles position).
  const scale = useCanvasStore((s) => (item.locked ? s.viewport().scale : 1))
  if (!item.visible) return null
  if (isDOMLayerItem(item)) return null
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
      x={item.x + item.width - 18 / scale}
      y={item.y + 4 / scale}
      text="🔒"
      fontSize={14 / scale}
      fill={canvasColor("accent")}
      shadowEnabled
      shadowColor="rgba(0,0,0,0.85)"
      shadowBlur={4 / scale}
      listening={false}
    />
  ) : null
  return (
    <ItemErrorBoundary itemId={item.id} x={item.x} y={item.y} width={item.width} height={item.height}>
      <Group>
        <Inner item={item} />
        {tintRect}
        {lockMarker}
      </Group>
    </ItemErrorBoundary>
  )
})

export const DOMLayerItemRenderer = React.memo(function DOMLayerItemRenderer({ item }: Props): React.ReactElement | null {
  if (!item.visible || !isDOMLayerItem(item)) return null
  return <Inner item={item} domOnly />
})
