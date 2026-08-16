import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../types'

export type SourceCaptureReference = {
  reference: string
  locator?: string
  sourceItemId?: string
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
  }
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
