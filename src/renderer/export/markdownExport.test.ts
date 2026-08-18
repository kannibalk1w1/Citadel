import { describe, expect, it } from 'vitest'
import type { CanvasItem, Connection } from '../../types'
import { createSourceCapture } from '../canvas/sourceCapture'
import { itemsToMarkdown, markdownExportFilename, markdownItemOrder, relativeAssetPath } from './markdownExport'

function item(patch: Partial<CanvasItem> & { id: string; type: CanvasItem['type'] }): CanvasItem {
  return {
    x: 0, y: 0, width: 200, height: 120, rotation: 0, zIndex: 1,
    locked: false, visible: true, opacity: 1, tags: [],
    ...patch,
  }
}

const options = { boardName: 'Colour study', exportedAt: Date.UTC(2026, 7, 16), destinationDir: '/vault/notes' }

describe('markdown export', () => {
  it('reads down the board in bands, left to right inside a band', () => {
    const topRight = item({ id: 'b', type: 'sticky', x: 400, y: 10 })
    const topLeft = item({ id: 'a', type: 'sticky', x: 0, y: 40 })
    const below = item({ id: 'c', type: 'sticky', x: 0, y: 600 })

    expect(markdownItemOrder([below, topRight, topLeft]).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps note text verbatim so an imported .md leaves as itself', () => {
    const note = item({
      id: 'n', type: 'text', tags: ['study'],
      meta: { content: '# Ideas\n\n- warm shadow edge', documentFormat: 'markdown', documentName: 'ideas.md' },
    })

    const markdown = itemsToMarkdown([note], [], options)

    expect(markdown).toContain('## ideas.md')
    expect(markdown).toContain('# Ideas\n\n- warm shadow edge')
    expect(markdown).toContain('#study')
    expect(markdown).toContain('tags: [study]')
  })

  it('fences a code card with its language and drops the fence info for plain text', () => {
    const snippet = item({ id: 'c', type: 'code', meta: { code: 'const a = 1', language: 'typescript' } })
    const plain = item({ id: 'p', type: 'code', y: 500, meta: { code: 'notes', language: 'plaintext' } })

    const markdown = itemsToMarkdown([snippet, plain], [], options)

    expect(markdown).toContain('```typescript\nconst a = 1\n```')
    expect(markdown).toContain('```\nnotes\n```')
  })

  it('links assets relative to where the note is written', () => {
    const image = item({ id: 'i', type: 'image', src: '/vault/assets/ref study.png' })

    const markdown = itemsToMarkdown([image], [], options)

    expect(markdown).toContain('![ref study.png](<../assets/ref study.png>)')
  })

  it('carries a capture across as a quotation with its citation', () => {
    const capture = createSourceCapture('Warm orange carries the focal value.', {
      reference: 'https://example.com/study', locator: 'Figure 2', sourceItemId: 'image-1',
      region: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
    }, { x: 0, y: 0 }, 'capture-1')

    const markdown = itemsToMarkdown([capture], [], options)

    expect(markdown).toContain('> Warm orange carries the focal value.')
    expect(markdown).toContain('— https://example.com/study, Figure 2')
    expect(markdown).toContain('Image region: 10%, 20%, 40%, 30%')
  })

  it('lists only the threads whose two ends were both exported', () => {
    const a = item({ id: 'a', type: 'sticky', meta: { content: 'Source' } })
    const b = item({ id: 'b', type: 'sticky', y: 500, meta: { content: 'Echo' } })
    const threads: Connection[] = [
      { id: 't1', fromId: 'a', toId: 'b', fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier', color: '#73a8db', width: 1.5, arrowHead: 'arrow', meaning: 'echo', dashed: false },
      { id: 't2', fromId: 'a', toId: 'missing', fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier', color: '#73a8db', width: 1.5, arrowHead: 'arrow', dashed: false },
    ]

    const markdown = itemsToMarkdown([a, b], threads, options)

    expect(markdown).toContain('- Source → Echo — echo')
    expect(markdown).not.toContain('missing')
  })

  it('leaves a path alone when it cannot be made relative', () => {
    expect(relativeAssetPath('C:/vault/notes', 'D:/photos/ref.png')).toBe('D:/photos/ref.png')
    expect(relativeAssetPath('/vault/notes', 'https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(relativeAssetPath(undefined, '/vault/assets/a.png')).toBe('/vault/assets/a.png')
    expect(relativeAssetPath('C:\\vault\\notes', 'C:\\vault\\assets\\a.png')).toBe('../assets/a.png')
  })

  it('makes a filename a vault can hold', () => {
    expect(markdownExportFilename('Colour: study/2')).toBe('Colour- study-2.md')
    expect(markdownExportFilename('   ')).toBe('citadel-board.md')
  })
})
