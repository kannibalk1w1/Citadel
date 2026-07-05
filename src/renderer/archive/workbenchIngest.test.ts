import { describe, expect, it } from 'vitest'
import { buildIngestItems, relicTypeForExtension } from './workbenchIngest'

describe('relicTypeForExtension', () => {
  it('maps media extensions to relic types', () => {
    expect(relicTypeForExtension('png')).toBe('image')
    expect(relicTypeForExtension('JPG')).toBe('image')
    expect(relicTypeForExtension('gif')).toBe('gif')
    expect(relicTypeForExtension('mp4')).toBe('video')
    expect(relicTypeForExtension('webm')).toBe('video')
    expect(relicTypeForExtension('mp3')).toBe('audio')
    expect(relicTypeForExtension('glb')).toBe('model3d')
    expect(relicTypeForExtension('obj')).toBe('model3d')
    expect(relicTypeForExtension('exe')).toBeNull()
  })
})

describe('buildIngestItems', () => {
  it('lays relics out in a grid from the origin with fresh ids', () => {
    let n = 0
    const items = buildIngestItems(
      ['C:/refs/a.png', 'C:/refs/b.gif', 'C:/refs/c.mp4', 'C:/refs/skip.txt'],
      { x: 1000, y: 500 },
      () => `id-${n++}`,
    )
    expect(items.length).toBe(3)
    expect(items[0]).toMatchObject({ id: 'id-0', type: 'image', src: 'C:/refs/a.png', x: 1000, y: 500 })
    expect(items[1].type).toBe('gif')
    expect(items[1].x).toBeGreaterThan(items[0].x)
    expect(items[2].type).toBe('video')
    expect(items.every((i) => i.tags.length === 0 && !i.locked && i.visible)).toBe(true)
  })

  it('wraps to a new row after the column cap', () => {
    const files = Array.from({ length: 7 }, (_, i) => `C:/refs/f${i}.png`)
    const items = buildIngestItems(files, { x: 0, y: 0 }, () => 'x')
    expect(items[5].y).toBeGreaterThan(items[0].y)
    expect(items[5].x).toBe(items[0].x)
  })
})
