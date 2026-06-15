import { describe, expect, it } from 'vitest'
import { normalizeThreadMeaning, threadMeaningLabel, threadMeaningOptions } from './threadMeaning'

describe('threadMeaning', () => {
  it('normalizes known Binding meanings', () => {
    expect(normalizeThreadMeaning('memory')).toBe('memory')
    expect(normalizeThreadMeaning('contradiction')).toBe('contradiction')
  })

  it('rejects unknown Binding meanings', () => {
    expect(normalizeThreadMeaning('rumour')).toBeUndefined()
    expect(normalizeThreadMeaning(null)).toBeUndefined()
  })

  it('exposes stable labels for selectors and badges', () => {
    expect(threadMeaningLabel('source')).toBe('Source')
    expect(threadMeaningOptions.map((option) => option.value)).toEqual([
      'reference',
      'memory',
      'source',
      'echo',
      'contradiction',
      'question',
      'proof',
      'inspiration',
      'warning',
      'sequence',
    ])
  })
})
