import { describe, expect, it } from 'vitest'
import { capRichDocument, richDocumentFromWord } from './richDocument'
import { DOCUMENT_LIMITS, readRichDocument, richDocumentText } from '../types/documents'

describe('Mammoth tree projection', () => {
  it('retains headings, combined emphasis, safe links and nested list structure', () => {
    const text = (value: string) => ({ type: 'text', value })
    const document = richDocumentFromWord({ type: 'document', children: [
      { type: 'paragraph', styleName: 'Heading 2', children: [text('Heading')] },
      { type: 'paragraph', children: [
        { type: 'run', isBold: true, isItalic: true, children: [text('both')] },
        { type: 'hyperlink', href: 'https://example.com', children: [text('safe')] },
        { type: 'hyperlink', href: 'javascript:evil', children: [text('unsafe')] },
        { type: 'image' },
      ] },
      { type: 'paragraph', numbering: { level: '0', isOrdered: true }, children: [text('first')] },
      { type: 'paragraph', numbering: { level: '1', isOrdered: false }, children: [text('nested')] },
      { type: 'paragraph', numbering: { level: '0', isOrdered: true }, children: [text('second')] },
    ] })
    expect(document.blocks[0]).toMatchObject({ type: 'heading', level: 2 })
    expect(document.blocks[1].runs).toEqual([{ text: 'both', bold: true, italic: true }, { text: 'safe', href: 'https://example.com' }, { text: 'unsafe' }])
    expect(document.blocks[4]).toMatchObject({ type: 'list', ordered: true, start: 2 })
    expect(richDocumentText(document)).toContain('1. first\n\n  • nested\n\n2. second')
  })

  it('caps runs without losing their formatting or splitting UTF-16 pairs', () => {
    const result = capRichDocument({ version: 1, blocks: [{ type: 'heading', level: 1, runs: [{ text: 'x'.repeat(DOCUMENT_LIMITS.maxCharacters - 1) + '😀tail', bold: true }] }] }, 'Shortened')
    expect(result.truncated).toBe(true)
    expect(result.document.blocks[0].runs[0].bold).toBe(true)
    expect(result.document.blocks[0].runs[0].text).not.toContain('\ud83d')
    expect(result.document.blocks[1].runs[0].text).toBe('Shortened')
    expect(readRichDocument(result.document)).not.toBeNull()
  })
})
