import { describe, expect, it } from 'vitest'
import { boardTemplates, createBoardTemplate } from './boardTemplates'

describe('boardTemplates', () => {
  it('exposes the expected starter templates', () => {
    expect(boardTemplates.map((template) => template.id)).toEqual(['blank', 'moodboard', 'comparison', 'storyboard'])
  })

  it('creates a blank board template without items', () => {
    const template = createBoardTemplate('blank', () => 'id')

    expect(template.name).toBe('Blank board')
    expect(template.items).toEqual([])
    expect(template.connections).toEqual([])
  })

  it('creates a storyboard with ordered presentation beats', () => {
    let counter = 0
    const template = createBoardTemplate('storyboard', () => `id-${++counter}`)

    expect(template.items).toHaveLength(4)
    expect(template.items.filter((item) => item.meta?.presentationOrder).map((item) => item.meta?.presentationOrder)).toEqual([1, 2, 3])
    expect(new Set(template.items.map((item) => item.id)).size).toBe(template.items.length)
  })
})
