import { describe, expect, it } from 'vitest'
import type { DocumentExtraction } from '../../types/documents'
import { buildSearchResult, getSearchResults } from '../ui/itemSearchModel'
import { parseProjectFile } from '../utils/projectSchema'
import {
  DOCUMENT_ITEM_LAYOUT,
  buildDocumentItem,
  documentDropFormat,
  documentImportFailureMessage,
  documentImportedMessage,
  documentItemHeight,
} from './documentImport'

const extraction: DocumentExtraction = {
  ok: true,
  format: 'docx',
  sourcePath: '/home/scribe/notes/brief.docx',
  sourceName: 'brief.docx',
  text: 'Opening line\n\nSecond paragraph',
  characters: 29,
  words: 4,
  truncated: false,
}

const placement = { id: 'doc-1', dropX: 500, dropY: 400, offsetIndex: 0, stackOffset: 20, zIndex: 12 }

describe('documentDropFormat', () => {
  it('claims .docx and .doc, and nothing else', () => {
    expect(documentDropFormat('brief.docx')).toBe('docx')
    expect(documentDropFormat('BRIEF.DOCX')).toBe('docx')
    expect(documentDropFormat('brief.doc')).toBe('doc')
    expect(documentDropFormat('brief.pdf')).toBeNull()
    expect(documentDropFormat('brief.docx.png')).toBeNull()
    expect(documentDropFormat('brief')).toBeNull()
  })
})

describe('documentItemHeight', () => {
  it('grows with the text and stays inside its bounds', () => {
    const short = documentItemHeight('one line')
    const longer = documentItemHeight(Array.from({ length: 8 }, () => 'a line of text').join('\n'))
    expect(short).toBe(DOCUMENT_ITEM_LAYOUT.minHeight)
    expect(longer).toBeGreaterThan(short)
    expect(documentItemHeight('x'.repeat(500_000))).toBe(DOCUMENT_ITEM_LAYOUT.maxHeight)
  })
})

describe('buildDocumentItem', () => {
  it('produces an ordinary editable text item', () => {
    const item = buildDocumentItem(extraction, placement)

    expect(item.type).toBe('text')
    expect(item.meta?.content).toBe(extraction.text)
    expect(item.locked).toBe(false)
    expect(item.visible).toBe(true)
    expect(item.rotation).toBe(0)
    expect(item.opacity).toBe(1)
    expect(item.tags).toEqual([])
    expect(item.zIndex).toBe(12)
  })

  it('keeps an honest reference to the document it came from', () => {
    const item = buildDocumentItem(extraction, placement)

    expect(item.src).toBe('/home/scribe/notes/brief.docx')
    expect(item.meta).toMatchObject({
      documentFormat: 'docx',
      documentName: 'brief.docx',
      documentCharacters: 29,
      documentWords: 4,
      documentTruncated: false,
    })
    // Plain text only: no HTML, no styling carried across from Word.
    expect(JSON.stringify(item.meta)).not.toContain('<')
  })

  it('centres on the drop point and steps later files aside', () => {
    const first = buildDocumentItem(extraction, placement)
    const second = buildDocumentItem(extraction, { ...placement, id: 'doc-2', offsetIndex: 2 })

    expect(first.x).toBe(500 - first.width / 2)
    expect(first.y).toBe(400 - first.height / 2)
    expect(second.x).toBe(first.x + 40)
    expect(second.y).toBe(first.y + 40)
  })

  it('records a shortened import so the item never claims to be whole', () => {
    const item = buildDocumentItem({ ...extraction, truncated: true, characters: 500_000 }, placement)
    expect(item.meta?.documentTruncated).toBe(true)
    expect(item.meta?.documentCharacters).toBe(500_000)
  })

  it('survives a save and reopen with its text and source intact', () => {
    const item = buildDocumentItem(extraction, placement)
    const project = {
      version: '1.0.0',
      createdAt: 1,
      updatedAt: 2,
      activeBoardId: 'board-1',
      boards: [{ id: 'board-1', name: 'Board', items: [item], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    }

    const reopened = parseProjectFile(JSON.stringify(project)).boards[0].items[0]
    expect(reopened).toEqual(item)
  })

  it('lands in search by its text and by its document name', () => {
    const item = buildDocumentItem(extraction, placement)

    expect(getSearchResults([item], 'second paragraph')).toHaveLength(1)
    expect(getSearchResults([item], 'brief.docx')).toHaveLength(1)
    expect(getSearchResults([item], 'type:text')).toHaveLength(1)
    expect(getSearchResults([item], 'no such phrase')).toHaveLength(0)
    expect(buildSearchResult(item).label).toBe('Opening line Second paragraph')
  })
})

describe('import messages', () => {
  it('confirms a plain import and flags a shortened one', () => {
    expect(documentImportedMessage(extraction)).toBe('brief.docx imported as text')
    expect(documentImportedMessage({ ...extraction, truncated: true }))
      .toBe('brief.docx imported as text, shortened to fit. The original file is unchanged.')
  })

  it('names the file and the way out for every failure', () => {
    const codes = [
      'legacy-doc', 'ole-container', 'unsupported-format', 'external-source',
      'missing', 'too-large', 'unreadable', 'empty', 'timeout',
    ] as const

    for (const code of codes) {
      const message = documentImportFailureMessage('brief.doc', code)
      expect(message).toContain('brief.doc')
      expect(message.length).toBeGreaterThan(20)
    }

    // Legacy .doc is refused with the conversion step, never a false promise.
    const legacy = documentImportFailureMessage('brief.doc', 'legacy-doc')
    expect(legacy).toContain('.docx only')
    expect(legacy).toContain('save as .docx')
    expect(documentImportFailureMessage('brief.docx', 'too-large')).toContain('25 MB')
    // A protected document is not reported as damage, and not as a false success.
    expect(documentImportFailureMessage('locked.docx', 'ole-container')).toContain('password-protected')
  })
})
