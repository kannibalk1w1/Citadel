import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem, Connection } from '../../types'
import { paintConnectionsForExport } from './connectionExport'

const item = (id: string, x: number): CanvasItem => ({
  id, x, y: 0, width: 100, height: 100, type: 'text', rotation: 0,
  zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
})
const connection: Connection = {
  id: 'c', fromId: 'a', toId: 'b', fromAnchor: 'right', toAnchor: 'left',
  style: 'straight', color: '#123456', width: 2, dashed: true, arrowHead: 'arrow',
  label: 'Source note', meaning: 'source',
}

function context() {
  const calls: Record<string, unknown[][]> = {}
  const ctx = new Proxy({}, {
    get: (_target, key: string) => (...args: unknown[]) => { (calls[key] ??= []).push(args) },
    set: () => true,
  }) as CanvasRenderingContext2D
  return { ctx, calls }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('connection export', () => {
  it.each([
    ['straight', 'M 100 50 L 300 50'],
    ['bezier', 'M 100 50 C 200 50, 200 50, 300 50'],
    ['elbow', 'M 100 50 L 200 50 L 200 50 L 300 50'],
  ] as const)('includes %s geometry, arrowheads, dashes, and labels', (style, path) => {
    const paths: string[] = []
    vi.stubGlobal('Path2D', class { constructor(d: string) { paths.push(d) } })
    const { ctx, calls } = context()
    paintConnectionsForExport(ctx, [{ ...connection, style }], [item('a', 0), item('b', 300)], { x: 0, y: 0, scale: 1 }, 2)
    expect(paths).toEqual([path])
    expect(calls.scale[0]).toEqual([2, 2])
    expect(calls.setLineDash).toContainEqual([[8, 4]])
    expect(calls.fill).toHaveLength(1)
    expect(calls.fillText.map((args) => args[0])).toEqual(['Source note', 'SOURCE'])
  })

  it('omits a connection when either endpoint is outside the exported selection or hidden', () => {
    const { ctx, calls } = context()
    const viewport = { x: 0, y: 0, scale: 1 }
    paintConnectionsForExport(ctx, [connection], [item('a', 0)], viewport, 1)
    paintConnectionsForExport(ctx, [connection], [item('a', 0), { ...item('b', 300), visible: false }], viewport, 1)
    expect(calls.stroke).toBeUndefined()
    expect(calls.fillText).toBeUndefined()
  })
})
