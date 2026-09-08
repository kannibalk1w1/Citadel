import { describe, expect, it } from 'vitest'
import { parseDocumentMarkdown, parseDocumentInline, readRichDocument, richDocumentMarkdown, richDocumentText, safeDocumentLink, sliceDocumentText } from '../../types/documents'
import { documentEditorSource, documentTextMetaPatch, itemRichDocument } from './richDocument'
import { layoutRichDocument } from './richDocumentLayout'

const source = '# Heading\n\nA **bold** and *italic* [reference](https://example.com).\n\n1. First\n  - Nested\n\n> Quote\n\n```ts\nconst a = 1\n```'
const document = parseDocumentMarkdown(source)
const meta = { content: richDocumentText(document), documentMarkdown: source, richDocument: document }

describe('safe rich documents', () => {
  it('preserves supported blocks and inline marks, with readable plain text', () => {
    expect(document.blocks.map((block) => block.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'quote', 'code'])
    expect(document.blocks[1].runs).toContainEqual({ text: 'bold', bold: true })
    expect(document.blocks[1].runs).toContainEqual({ text: 'italic', italic: true })
    expect(document.blocks[1].runs).toContainEqual({ text: 'reference', href: 'https://example.com' })
    expect(document.blocks[3]).toMatchObject({ level: 1, ordered: false })
    expect(meta.content).toContain('A bold and italic reference.')
    expect(documentEditorSource(meta)).toBe(source)
  })

  it('supports combined emphasis, literal identifiers, escapes, setext and hard breaks', () => {
    expect(parseDocumentInline('***both*** file_name \\*literal\\*')).toEqual([
      { text: 'both', bold: true, italic: true }, { text: ' file_name *literal*' },
    ])
    const parsed = parseDocumentMarkdown('Title\n=====\n\nfirst  \nnext')
    expect(parsed.blocks[0]).toMatchObject({ type: 'heading', level: 1 })
    expect(richDocumentText(parsed)).toBe('Title\n\nfirst\nnext')
  })

  it('never makes HTML, images or dangerous schemes executable', () => {
    const parsed = parseDocumentMarkdown('<script>alert(1)</script>\n<img src="https://evil.test/pixel">\n\n![alt](https://evil.test/image) [bad](javascript:evil) [local](file:///tmp/private)')
    expect(richDocumentText(parsed)).toContain('<script>alert(1)</script>')
    expect(richDocumentText(parsed)).toContain('alt bad local')
    expect(parsed.blocks.flatMap((block) => block.runs).some((run) => run.href)).toBe(false)
    for (const link of ['javascript:alert(1)', 'data:text/html,hi', 'file:///secret', '//example.com', 'https://example.com/\nscript', 'https://']) expect(safeDocumentLink(link)).toBeUndefined()
    expect(safeDocumentLink('mailto:person@example.com')).toBe('mailto:person@example.com')
    expect(readRichDocument({ version: 1, blocks: [{ type: 'paragraph', runs: [{ text: 'bad', href: 'javascript:evil' }] }] })).toBeNull()
  })

  it('keeps old/plain items literal and ignores stale or malformed formatting', () => {
    expect(itemRichDocument({ content: '**literal**', documentFormat: 'markdown' })).toBeNull()
    expect(documentEditorSource({ content: '**literal**' })).toBe('**literal**')
    expect(itemRichDocument({ ...meta, content: 'plugin changed this' })).toBeNull()
    expect(readRichDocument({ version: 2, blocks: [] })).toBeNull()
    expect(readRichDocument({ version: 1, blocks: [{ type: 'heading', level: 100, runs: [] }] })).toBeNull()
  })

  it('updates source, formatting and searchable content together without mutating the undo snapshot', () => {
    const snapshot = JSON.stringify(meta)
    const patch = documentTextMetaPatch(meta, '## New **title**')
    expect(patch.content).toBe('New title')
    expect(patch.documentMarkdown).toBe('## New **title**')
    expect(patch.richDocument).toMatchObject({ blocks: [{ type: 'heading', level: 2 }] })
    expect(JSON.stringify(meta)).toBe(snapshot)
    expect(documentTextMetaPatch(meta, source)).toEqual(meta)
    expect(documentTextMetaPatch({ content: 'plain' }, '**still plain**')).toEqual({ content: '**still plain**' })
  })

  it('round-trips the Word subset without exposing its markup as plain content', () => {
    const original = parseDocumentMarkdown('# Title\n\n**Strong** and *soft* [link](https://example.com)\n\n1. First\n\n- Other')
    expect(richDocumentText(parseDocumentMarkdown(richDocumentMarkdown(original)))).toBe(richDocumentText(original))
  })

  it('bounds edits and does not split emoji at truncation boundaries', () => {
    expect(sliceDocumentText('ab😀c', 3)).toBe('ab')
    const patch = documentTextMetaPatch(meta, 'x'.repeat(199999) + '😀tail')
    expect(patch.documentTruncated).toBe(true)
    expect(patch.content).toContain('Citadel shortened this edit')
    expect(patch.documentMarkdown).not.toContain('\ud83d')
    expect(readRichDocument(patch.richDocument)).not.toBeNull()
  })
})

describe('Konva document layout', () => {
  const measure = (text: string, size: number) => Array.from(text).length * size / 2
  it('keeps heading sizes, emphasis and link decoration data through wrapping', () => {
    const runs = layoutRichDocument(document, 180, 600, 16, measure)
    expect(runs[0].fontSize).toBeGreaterThan(16)
    expect(runs.find((run) => run.text === 'bold')?.fontStyle).toBe('bold')
    expect(runs.find((run) => run.text === 'reference')?.href).toBe('https://example.com')
    expect(runs.every((run) => run.x >= 0 && run.x + run.width <= 180)).toBe(true)
  })
  it('bounds visible work, clips by height and wraps emoji intact', () => {
    const parsed = parseDocumentMarkdown('😀'.repeat(10000))
    const runs = layoutRichDocument(parsed, 20, 100, 16, measure)
    expect(runs.length).toBeLessThan(20)
    expect(runs.every((run) => run.text === '😀' && run.y + 16 * 1.35 <= 100)).toBe(true)
    expect(layoutRichDocument(parsed, 0, 100, 16, measure)).toEqual([])
  })
})
