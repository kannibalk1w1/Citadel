import { describe, expect, it } from 'vitest'
import {
  CURSOR_SLOTS,
  MAX_CURSOR_BYTES,
  cursorPackCss,
  isUsableCursorImage,
  normalizeCursorPack,
  type CursorPack,
} from './cursorPack'

const image = (bytes = 8, type = 'image/png'): string =>
  `data:${type};base64,${'A'.repeat(Math.ceil((bytes * 4) / 3))}`

const pack = (over: Partial<CursorPack> = {}): unknown => ({
  format: 'citadel-cursors',
  version: 1,
  name: 'Test pack',
  cursors: { default: image() },
  ...over,
})

describe('isUsableCursorImage', () => {
  it('accepts the image types a cursor can actually be', () => {
    for (const type of ['image/png', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']) {
      expect(isUsableCursorImage(image(8, type))).toBe(true)
    }
  })

  it('refuses anything that would reach out over the network or the disk', () => {
    expect(isUsableCursorImage('https://example.com/cursor.png')).toBe(false)
    expect(isUsableCursorImage('http://example.com/cursor.png')).toBe(false)
    expect(isUsableCursorImage('file:///C:/Windows/cursor.cur')).toBe(false)
    expect(isUsableCursorImage('local:///C:/cursor.cur')).toBe(false)
  })

  it('refuses payloads that are not images', () => {
    expect(isUsableCursorImage('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isUsableCursorImage('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false)
    expect(isUsableCursorImage('javascript:alert(1)')).toBe(false)
  })

  it('refuses characters that would break out of the CSS url()', () => {
    expect(isUsableCursorImage('data:image/png;base64,AAAA") , url("evil')).toBe(false)
    expect(isUsableCursorImage('data:image/png;base64,AA AA')).toBe(false)
    expect(isUsableCursorImage('data:image/png;base64,AAAA\\')).toBe(false)
    expect(isUsableCursorImage("data:image/png;base64,AAAA'")).toBe(false)
    expect(isUsableCursorImage('data:image/png;base64,AAAA)')).toBe(false)
  })

  it('refuses a non-base64 body', () => {
    expect(isUsableCursorImage('data:image/png,notbase64')).toBe(false)
    expect(isUsableCursorImage('data:image/png;base64,')).toBe(false)
  })

  it('bounds a single cursor', () => {
    expect(isUsableCursorImage(image(MAX_CURSOR_BYTES))).toBe(true)
    expect(isUsableCursorImage(image(MAX_CURSOR_BYTES + 64))).toBe(false)
  })

  it('refuses values that are not strings', () => {
    expect(isUsableCursorImage(undefined)).toBe(false)
    expect(isUsableCursorImage(42)).toBe(false)
    expect(isUsableCursorImage({ toString: () => image() })).toBe(false)
  })
})

describe('normalizeCursorPack', () => {
  it('accepts a well-formed pack and keeps every slot', () => {
    const every = Object.fromEntries(CURSOR_SLOTS.map((slot) => [slot, image()]))

    const result = normalizeCursorPack(pack({ cursors: every }))

    expect(Object.keys(result?.cursors ?? {}).sort()).toEqual([...CURSOR_SLOTS].sort())
  })

  it('rejects a pack that is not the right format or version', () => {
    expect(normalizeCursorPack(pack({ format: 'something-else' as never }))).toBeNull()
    expect(normalizeCursorPack(pack({ version: 2 as never }))).toBeNull()
    expect(normalizeCursorPack(null)).toBeNull()
    expect(normalizeCursorPack('a string')).toBeNull()
  })

  it('rejects a pack naming a slot the app has no cursor for', () => {
    expect(normalizeCursorPack(pack({ cursors: { nonsense: image() } as never }))).toBeNull()
  })

  it('rejects the whole pack when any one image is unusable', () => {
    // Dropping just the bad cursor would look like the app losing it.
    expect(normalizeCursorPack(pack({
      cursors: { default: image(), select: 'https://example.com/x.png' } as never,
    }))).toBeNull()
  })

  it('rejects an empty or unusable name', () => {
    expect(normalizeCursorPack(pack({ name: '   ' }))).toBeNull()
    expect(normalizeCursorPack(pack({ name: 'x'.repeat(49) }))).toBeNull()
  })

  it('rejects a pack with no cursors in it', () => {
    expect(normalizeCursorPack(pack({ cursors: {} }))).toBeNull()
    expect(normalizeCursorPack(pack({ cursors: [] as never }))).toBeNull()
  })

  it('bounds the pack as a whole, not just each cursor', () => {
    const chunky = Object.fromEntries(
      CURSOR_SLOTS.map((slot) => [slot, image(MAX_CURSOR_BYTES)]),
    )

    expect(normalizeCursorPack(pack({ cursors: chunky }))).toBeNull()
  })

  it('normalizes whitespace in the name', () => {
    expect(normalizeCursorPack(pack({ name: '  Dragon   Scimitar ' }))?.name).toBe('Dragon Scimitar')
  })
})

describe('cursorPackCss', () => {
  const standard = { default: 'default', pan: 'grab', connect: 'crosshair' }

  it('hands back the standard cursors untouched when no pack is set', () => {
    expect(cursorPackCss(null, standard)).toEqual(standard)
  })

  it('keeps the standard cursor as the fallback behind every custom one', () => {
    const custom = normalizeCursorPack(pack({ cursors: { pan: image() } }))!

    expect(cursorPackCss(custom, standard).pan).toBe(`url("${image()}"), grab`)
  })

  it('leaves slots the pack does not cover on the standard cursor', () => {
    const custom = normalizeCursorPack(pack({ cursors: { pan: image() } }))!

    expect(cursorPackCss(custom, standard).connect).toBe('crosshair')
  })

  it('falls back to the default cursor for a slot with no standard of its own', () => {
    const custom = normalizeCursorPack(pack({ cursors: { record: image() } }))!

    expect(cursorPackCss(custom, standard).record).toBe(`url("${image()}"), default`)
  })
})
