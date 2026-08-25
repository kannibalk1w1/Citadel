import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { ITEM_TYPES, type ItemType } from '../../../types'

/**
 * Every kind of thing on a board has to answer the tools that act on it.
 *
 * These were written out again in each component, and coverage had drifted
 * badly: connect was missing from code cards entirely, so a thread could
 * neither start nor land on a snippet, and link and tag were implemented on
 * three of the eleven types — on the other eight both tools silently did
 * nothing. They now share `handleRelicToolPress`, and this holds every item
 * type to it.
 *
 * A source scan for the same reason `konvaPaint.test.tsx` is one: the property
 * is "no component may leave this out", which nothing can assert by rendering
 * one component at a time.
 */

const COMPONENT_FOR_TYPE: Record<ItemType, string> = {
  image: 'ImageItem.tsx',
  gif: 'GifItem.tsx',
  video: 'VideoItem.tsx',
  youtube: 'YouTubeItem.tsx',
  audio: 'AudioItem.tsx',
  model3d: 'Model3DItem.tsx',
  text: 'TextItem.tsx',
  sticky: 'StickyItem.tsx',
  comparison: 'ComparisonItem.tsx',
  swatch: 'SwatchItem.tsx',
  code: 'CodeItem.tsx',
}

const source = (file: string): string => readFileSync(join(__dirname, file), 'utf-8')

describe('connect coverage', () => {
  it('names a component for every item type, and no others', () => {
    // Fails the moment ITEM_TYPES grows, which is the point: a new type has to
    // be listed here, and listing it runs the check below against it.
    expect(Object.keys(COMPONENT_FOR_TYPE).sort()).toEqual([...ITEM_TYPES].sort())
  })

  it.each(ITEM_TYPES)('%s answers connect, link and tag', (type) => {
    // The call, not the name: an import alone proves nothing, and a bare
    // substring check still passed when the symbol was renamed under it.
    expect(source(COMPONENT_FOR_TYPE[type])).toMatch(/handleRelicToolPress\(/)
  })
})
