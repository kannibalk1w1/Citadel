import { describe, expect, it } from 'vitest'
import { getManySettings, setManySettings } from './settingsStore'

describe('settingsStore batch helpers', () => {
  it('gets many values and returns null for missing keys', () => {
    expect(getManySettings({ a: 1, b: false }, ['a', 'b', 'c'])).toEqual({
      a: 1,
      b: false,
      c: null,
    })
  })

  it('ignores non-string keys when getting many values', () => {
    expect(getManySettings({ a: 1 }, ['a', 42])).toEqual({ a: 1 })
  })

  it('sets many values without dropping existing settings', () => {
    expect(setManySettings({ a: 1 }, { b: 2, c: false })).toEqual({
      a: 1,
      b: 2,
      c: false,
    })
  })
})
