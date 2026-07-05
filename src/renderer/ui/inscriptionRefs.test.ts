import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { itemInscriptionRefs, parseInscriptionRefs } from './inscriptionRefs'

describe('parseInscriptionRefs', () => {
  it('extracts [[ref]] tokens from prose', () => {
    expect(parseInscriptionRefs('see [[dragon skull]] beside [[palette wall]]')).toEqual(['dragon skull', 'palette wall'])
  })

  it('trims and drops empty refs', () => {
    expect(parseInscriptionRefs('[[  spaced ref  ]] and [[]] and [[ ]]')).toEqual(['spaced ref'])
  })

  it('dedupes case-insensitively, keeping the first casing', () => {
    expect(parseInscriptionRefs('[[Dragon]] then [[dragon]] again')).toEqual(['Dragon'])
  })

  it('returns empty for plain prose or no content', () => {
    expect(parseInscriptionRefs('no references here')).toEqual([])
    expect(parseInscriptionRefs('')).toEqual([])
  })
})

describe('itemInscriptionRefs', () => {
  const item = (content?: unknown): CanvasItem => ({
    id: 'i1', type: 'sticky',
    x: 0, y: 0, width: 10, height: 10,
    rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
    meta: content === undefined ? undefined : { content },
  })

  it('reads refs from item meta content', () => {
    expect(itemInscriptionRefs(item('link to [[the reliquary]]'))).toEqual(['the reliquary'])
  })

  it('handles items without content', () => {
    expect(itemInscriptionRefs(item())).toEqual([])
    expect(itemInscriptionRefs(item(42))).toEqual([])
  })
})
