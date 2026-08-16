import { describe, expect, it } from 'vitest'
import { CODE_LANGUAGES, normalizeCodeLanguage } from './codeSnippet'

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
