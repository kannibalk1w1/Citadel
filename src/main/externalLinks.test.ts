import { describe, expect, it } from 'vitest'
import { isExternallyOpenable } from './externalLinks'

describe('isExternallyOpenable', () => {
  it('allows browser-safe schemes', () => {
    expect(isExternallyOpenable('https://example.com/ref')).toBe(true)
    expect(isExternallyOpenable('http://example.com')).toBe(true)
    expect(isExternallyOpenable('mailto:archivist@example.com')).toBe(true)
  })

  it('rejects schemes that can launch or read local files', () => {
    expect(isExternallyOpenable('file:///C:/Windows/System32/calc.exe')).toBe(false)
    expect(isExternallyOpenable('javascript:alert(1)')).toBe(false)
    expect(isExternallyOpenable('ms-msdt:/id')).toBe(false)
    expect(isExternallyOpenable('smb://attacker/share')).toBe(false)
  })

  it('rejects values that are not usable URLs', () => {
    expect(isExternallyOpenable('')).toBe(false)
    expect(isExternallyOpenable('   ')).toBe(false)
    expect(isExternallyOpenable('example.com')).toBe(false)
    expect(isExternallyOpenable(undefined)).toBe(false)
    expect(isExternallyOpenable(42)).toBe(false)
  })
})
