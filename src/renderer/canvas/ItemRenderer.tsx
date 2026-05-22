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

const DOM_TYPES = new Set(['video', 'youtube', 'audio', 'model3d'])

type Props = { item: CanvasItem }

function Inner({ item }: Props): React.ReactElement | null {
  switch (item.type) {
    case 'image':      return <ImageItem item={item} />
    case 'gif':        return <GifItem item={item} />
    case 'video':      return <VideoItem item={item} />
    case 'youtube':    return <YouTubeItem item={item} />
    case 'audio':      return <AudioItem item={item} />
    case 'model3d':    return <Model3DItem item={item} />
    case 'sticky':     return <StickyItem item={item} />
    case 'text':       return <TextItem item={item} />
    case 'swatch':     return <SwatchItem item={item} />
    case 'comparison': return <ComparisonItem item={item} />
    default:           return null
  }
}

export function ItemRenderer({ item }: Props): React.ReactElement | null {
  const viewport = useCanvasStore((s) => s.viewport())
  if (!item.visible) return null
  // Tint overlay for Konva items — DOM items handle tint inside DOMItem
  const tintRect = item.tint && !DOM_TYPES.has(item.type) ? (
    <Rect
      x={item.x} y={item.y}
      width={item.width} height={item.height}
      rotation={item.rotation}
      fill={item.tint.color}
      opacity={item.tint.opacity}
      listening={false}
    />
  ) : null
  const lockMarker = item.locked && !DOM_TYPES.has(item.type) ? (
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
        {lockMarker}
      </Group>
    </ItemErrorBoundary>
  )
}
