import type { CanvasItem } from '../../../types'

const BUCKET_SIZE = 200  // pixels in canvas space

function bucketKey(bx: number, by: number): string {
  return `${bx},${by}`
}

export class SpatialIndex {
  private buckets: Map<string, CanvasItem[]> = new Map()

  rebuild(items: CanvasItem[]): void {
    this.buckets.clear()
    for (const item of items) {
      this.insert(item)
    }
  }

  insert(item: CanvasItem): void {
    const bx0 = Math.floor(item.x / BUCKET_SIZE)
    const by0 = Math.floor(item.y / BUCKET_SIZE)
    const bx1 = Math.floor((item.x + item.width) / BUCKET_SIZE)
    const by1 = Math.floor((item.y + item.height) / BUCKET_SIZE)
    for (let bx = bx0; bx <= bx1; bx++) {
      for (let by = by0; by <= by1; by++) {
        const key = bucketKey(bx, by)
        if (!this.buckets.has(key)) this.buckets.set(key, [])
        this.buckets.get(key)!.push(item)
      }
    }
  }

  query(x: number, y: number, w: number, h: number): CanvasItem[] {
    const bx0 = Math.floor(x / BUCKET_SIZE)
    const by0 = Math.floor(y / BUCKET_SIZE)
    const bx1 = Math.floor((x + w) / BUCKET_SIZE)
    const by1 = Math.floor((y + h) / BUCKET_SIZE)
    const seen = new Set<string>()
    const result: CanvasItem[] = []
    for (let bx = bx0; bx <= bx1; bx++) {
      for (let by = by0; by <= by1; by++) {
        const items = this.buckets.get(bucketKey(bx, by)) ?? []
        for (const item of items) {
          if (!seen.has(item.id)) {
            seen.add(item.id)
            result.push(item)
          }
        }
      }
    }
    return result
  }
}

export const spatialIndex = new SpatialIndex()
