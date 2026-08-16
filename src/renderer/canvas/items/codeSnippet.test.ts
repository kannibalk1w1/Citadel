import { describe, expect, it } from 'vitest'
import { CODE_LANGUAGES, gutterWidth, normalizeCodeLanguage } from './codeSnippet'

describe('code snippet languages', () => {
  it('offers focused, readable language choices', () => {
    expect(CODE_LANGUAGES).toContain('typescript')
    expect(CODE_LANGUAGES).toContain('python')
  })

  it('keeps legacy free-text languages safe', () => {
    expect(normalizeCodeLanguage('sql')).toBe('sql')
    expect(normalizeCodeLanguage('elvish')).toBe('plaintext')
  })
})

describe('line number gutter', () => {
  it('holds a floor wide enough for short snippets', () => {
    expect(gutterWidth(1)).toBe(28)
    expect(gutterWidth(9)).toBe(28)
    expect(gutterWidth(99)).toBe(28)
  })

  it('widens once the line count needs another digit', () => {
    expect(gutterWidth(100)).toBeGreaterThan(gutterWidth(99))
    expect(gutterWidth(1000)).toBeGreaterThan(gutterWidth(100))
  })

  it('stays positive for an empty snippet', () => {
    expect(gutterWidth(0)).toBe(28)
  })
})
