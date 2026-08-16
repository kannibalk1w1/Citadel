import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import JSZip from 'jszip'
import { afterAll, describe, expect, it } from 'vitest'
import {
  TRUNCATION_NOTICE,
  capDocumentText,
  countWords,
  documentFormatForPath,
  extractDocumentText,
  isExternalSource,
  isLegacyDocHeader,
  normalizeDocumentText,
  truncationNotice,
} from './documentText'
import { DOCUMENT_LIMITS } from '../types/documents'

const workDir = mkdtempSync(join(tmpdir(), 'citadel-docx-'))

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

/** The smallest package Word's own reader would accept: content types, a root relationship, one body. */
async function writeDocx(name: string, paragraphs: string[]): Promise<string> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '</Types>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>',
  )
  const body = paragraphs
    .map((text) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`)
    .join('')
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + `<w:body>${body}</w:body></w:document>`,
  )

  const path = join(workDir, name)
  writeFileSync(path, await zip.generateAsync({ type: 'nodebuffer' }))
  return path
}

describe('document text helpers', () => {
  it('recognises the two Word extensions and nothing else', () => {
    expect(documentFormatForPath('/docs/report.docx')).toBe('docx')
    expect(documentFormatForPath('C:\\Docs\\Report.DOCX')).toBe('docx')
    expect(documentFormatForPath('/docs/report.doc')).toBe('doc')
    expect(documentFormatForPath('/docs/report.pdf')).toBeNull()
    expect(documentFormatForPath('/docs/report')).toBeNull()
  })

  it('treats URL schemes as external but leaves Windows drive letters alone', () => {
    expect(isExternalSource('https://example.com/report.docx')).toBe(true)
    expect(isExternalSource('file:///tmp/report.docx')).toBe(true)
    expect(isExternalSource('data:application/octet-stream;base64,AA==')).toBe(true)
    expect(isExternalSource('C:\\Docs\\report.docx')).toBe(false)
    expect(isExternalSource('/home/user/report.docx')).toBe(false)
  })

  it('spots the OLE header a legacy .doc starts with', () => {
    expect(isLegacyDocHeader(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe(true)
    expect(isLegacyDocHeader(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]))).toBe(false)
    expect(isLegacyDocHeader(new Uint8Array([0xd0, 0xcf]))).toBe(false)
  })

  it('normalises Word whitespace without rewriting the words', () => {
    expect(normalizeDocumentText('First\r\n\r\n\r\n\r\nSecond   \r\n')).toBe('First\n\nSecond')
    expect(normalizeDocumentText('Non\u00a0breaking')).toBe('Non breaking')
    expect(normalizeDocumentText('   \n  \n ')).toBe('')
  })

  it('marks a capped document instead of quietly shortening it', () => {
    const short = capDocumentText('a short document', 100)
    expect(short).toEqual({ text: 'a short document', truncated: false })

    const long = capDocumentText('x'.repeat(50), 10)
    expect(long.truncated).toBe(true)
    expect(long.text.startsWith('x'.repeat(10))).toBe(true)
    expect(long.text).toContain(truncationNotice(10))
    expect(truncationNotice(200_000)).toBe(TRUNCATION_NOTICE)
  })

  it('counts words in the text as read', () => {
    expect(countWords('one two  three\nfour')).toBe(4)
    expect(countWords('   ')).toBe(0)
  })
})

describe('extractDocumentText', () => {
  it('reads a real .docx into plain text with honest counts', async () => {
    const path = await writeDocx('notes.docx', ['Citadel release notes', 'Second paragraph'])
    const result = await extractDocumentText(path)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.format).toBe('docx')
    expect(result.text).toBe('Citadel release notes\n\nSecond paragraph')
    expect(result.sourcePath).toBe(path)
    expect(result.sourceName).toBe('notes.docx')
    expect(result.words).toBe(5)
    expect(result.characters).toBe(result.text.length)
    expect(result.truncated).toBe(false)
  })

  it('caps a very long document and says so', async () => {
    const paragraph = 'word '.repeat(200).trim()
    const path = await writeDocx('long.docx', Array.from({ length: 250 }, () => paragraph))
    const result = await extractDocumentText(path)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.truncated).toBe(true)
    expect(result.characters).toBeGreaterThan(DOCUMENT_LIMITS.maxCharacters)
    expect(result.text).toContain(TRUNCATION_NOTICE)
    expect(result.text.length).toBeLessThan(DOCUMENT_LIMITS.maxCharacters + TRUNCATION_NOTICE.length + 8)
  })

  it('refuses a document with no text rather than adding an empty item', async () => {
    const path = await writeDocx('blank.docx', ['   ', ''])
    const result = await extractDocumentText(path)
    expect(result).toMatchObject({ ok: false, code: 'empty' })
  })

  it('rejects a file that is not a zip at all', async () => {
    const path = join(workDir, 'damaged.docx')
    writeFileSync(path, 'this was never a Word document')
    const result = await extractDocumentText(path)
    expect(result).toMatchObject({ ok: false, code: 'unreadable' })
  })

  it('rejects a zip with no Word body', async () => {
    const zip = new JSZip()
    zip.file('hello.txt', 'not a document part')
    const path = join(workDir, 'wrong-parts.docx')
    writeFileSync(path, await zip.generateAsync({ type: 'nodebuffer' }))
    const result = await extractDocumentText(path)
    expect(result).toMatchObject({ ok: false, code: 'unreadable' })
  })

  it('refuses a legacy .doc by extension before opening it', async () => {
    const result = await extractDocumentText(join(workDir, 'legacy.doc'))
    expect(result).toMatchObject({ ok: false, code: 'legacy-doc' })
  })

  it('names an OLE container under a .docx name rather than calling it damaged', async () => {
    // Both a renamed legacy .doc and a password-protected .docx look like this.
    const path = join(workDir, 'protected.docx')
    writeFileSync(path, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]))
    expect(await extractDocumentText(path)).toMatchObject({ ok: false, code: 'ole-container' })
  })

  it('reports a missing file rather than throwing', async () => {
    const result = await extractDocumentText(join(workDir, 'nowhere.docx'))
    expect(result).toMatchObject({ ok: false, code: 'missing' })
  })

  it('refuses an empty file', async () => {
    const path = join(workDir, 'zero.docx')
    writeFileSync(path, '')
    expect(await extractDocumentText(path)).toMatchObject({ ok: false, code: 'unreadable' })
  })

  it('refuses anything that is not a local .docx path', async () => {
    expect(await extractDocumentText('https://example.com/report.docx')).toMatchObject({ ok: false, code: 'external-source' })
    expect(await extractDocumentText('file:///tmp/report.docx')).toMatchObject({ ok: false, code: 'external-source' })
    expect(await extractDocumentText('relative/report.docx')).toMatchObject({ ok: false, code: 'external-source' })
    expect(await extractDocumentText(join(workDir, 'sheet.xlsx'))).toMatchObject({ ok: false, code: 'unsupported-format' })
    expect(await extractDocumentText(undefined)).toMatchObject({ ok: false, code: 'unsupported-format' })
    expect(await extractDocumentText(42)).toMatchObject({ ok: false, code: 'unsupported-format' })
  })

  it('refuses a document past the size bound before parsing it', async () => {
    const path = join(workDir, 'huge.docx')
    writeFileSync(path, Buffer.alloc(DOCUMENT_LIMITS.maxBytes + 1))
    const result = await extractDocumentText(path)
    expect(result).toMatchObject({ ok: false, code: 'too-large' })
  })
})
