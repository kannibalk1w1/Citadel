import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../types'

export type SourceCaptureReference = {
  reference: string
  locator?: string
  sourceItemId?: string
  region?: ImageRegion
}

/** A source-image crop in fractions of its width and height. */
export type ImageRegion = { x: number; y: number; width: number; height: number }

export function imageRegionFromPercent(input: string): ImageRegion | undefined {
  if (!input.trim()) return undefined
  const values = input.split(',').map((part) => Number(part.trim()))
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return undefined
  const [x, y, width, height] = values
  if (width <= 0 || height <= 0) return undefined
  const left = Math.max(0, Math.min(100, x)) / 100
  const top = Math.max(0, Math.min(100, y)) / 100
  return {
    x: left,
    y: top,
    width: Math.max(0, Math.min(1 - left, width / 100)),
    height: Math.max(0, Math.min(1 - top, height / 100)),
  }
}

export function imageRegionPercent(region: ImageRegion): string {
  return [region.x, region.y, region.width, region.height].map((value) => `${Math.round(value * 100)}%`).join(', ')
}

export function sourceCaptureReference(item: CanvasItem): SourceCaptureReference | undefined {
  if (item.meta?.kind !== 'source-capture') return undefined
  const value = item.meta.source
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  if (typeof source.reference !== 'string') return undefined
  return {
    reference: source.reference,
    locator: typeof source.locator === 'string' ? source.locator : undefined,
    sourceItemId: typeof source.sourceItemId === 'string' ? source.sourceItemId : undefined,
    region: validRegion(source.region),
  }
}

function validRegion(value: unknown): ImageRegion | undefined {
  if (!value || typeof value !== 'object') return undefined
  const region = value as Record<string, unknown>
  if (!['x', 'y', 'width', 'height'].every((key) => typeof region[key] === 'number' && Number.isFinite(region[key]))) return undefined
  if ((region.width as number) <= 0 || (region.height as number) <= 0) return undefined
  return { x: region.x as number, y: region.y as number, width: region.width as number, height: region.height as number }
}

export function createSourceCapture(
  content: string,
  reference: SourceCaptureReference,
  placement: { x: number; y: number },
  id = nanoid(),
): CanvasItem {
  return {
    id,
    type: 'sticky',
    x: placement.x,
    y: placement.y,
    width: 280,
    height: 180,
    rotation: 0,
    zIndex: Date.now(),
    locked: false,
    visible: true,
    opacity: 1,
    tags: ['capture'],
    meta: {
      kind: 'source-capture',
      content,
      source: reference,
      capturedAt: Date.now(),
      color: '#1e1b18',
    },
  }
}

export function sourceCaptureConnection(captureId: string, sourceItemId: string, color: string, id = nanoid()): Connection {
  return {
    id,
    fromId: captureId,
    toId: sourceItemId,
    fromAnchor: 'auto',
    toAnchor: 'auto',
    style: 'bezier',
    color,
    width: 1.5,
    arrowHead: 'arrow',
    meaning: 'source',
    dashed: false,
  }
}
