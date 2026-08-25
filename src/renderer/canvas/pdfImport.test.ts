import { describe, expect, it } from 'vitest'
import { isLocalSourcePath } from '../utils/pathToUrl'
import { pdfDropFailureMessage } from './pdfImport'

/**
 * A dropped PDF that could not be read used to disappear without a word: the
 * drop handler logged to the console and moved on. Every other import path in
 * Citadel says what happened, and this one now does too.
 */
describe('pdfDropFailureMessage', () => {
  it('names the file in every case, and never says only that something went wrong', () => {
    const errors = [
      new Error('Citadel previews local PDF files only'),
      new Error('Invalid PDF structure'),
      new Error('No password given'),
      new Error('Failed to read PDF: 404'),
      undefined,
    ]

    for (const error of errors) {
      const message = pdfDropFailureMessage('brief.pdf', error)
      expect(message).toContain('brief.pdf')
      expect(message).not.toMatch(/something went wrong/i)
    }
  })

  it('names the step that fixes a password-protected file', () => {
    expect(pdfDropFailureMessage('brief.pdf', new Error('No password given')))
      .toContain('unprotected copy')
  })

  it('separates a link from a damaged file, because the fixes are different', () => {
    expect(pdfDropFailureMessage('brief.pdf', new Error('Citadel previews local PDF files only')))
      .toContain('local PDF files only')
    expect(pdfDropFailureMessage('brief.pdf', new Error('Invalid PDF structure')))
      .toContain('may be damaged')
  })

  it('falls back to a plain sentence for a reason it does not recognise', () => {
    expect(pdfDropFailureMessage('brief.pdf', new Error('Canvas 2D context unavailable')))
      .toBe('brief.pdf could not be previewed, so nothing was added.')
  })
})

describe('isLocalSourcePath', () => {
  it('is what stands between a stored src and a fetch to the network', () => {
    expect(isLocalSourcePath('C:\\archive\\brief.pdf')).toBe(true)
    expect(isLocalSourcePath('/home/me/brief.pdf')).toBe(true)
    expect(isLocalSourcePath('https://example.com/brief.pdf')).toBe(false)
    expect(isLocalSourcePath('')).toBe(false)
  })
})
