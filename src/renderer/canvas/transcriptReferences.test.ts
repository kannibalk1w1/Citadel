import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { remapTranscriptReferences } from './transcriptReferences'
import { useCanvasStore } from '../store/canvasStore'
import { createRelicTemplate, stampRelicTemplate } from '../ui/relicTemplates'

const audio: CanvasItem = {
  id: 'audio', type: 'audio', x: 0, y: 0, width: 100, height: 80, rotation: 0,
  zIndex: 0, locked: false, visible: true, opacity: 1, tags: [], src: '/voice.wav',
  meta: { transcriptItemId: 'text' },
}
const transcript: CanvasItem = {
  ...audio, id: 'text', type: 'text',
  meta: { transcriptSourceItemId: 'audio', transcriptOf: '/voice.wav', content: 'Words' },
}

describe('copied transcript source identities', () => {
  it('remaps included source IDs without changing originals or external references', () => {
    const copy = remapTranscriptReferences(transcript, new Map([['audio', 'new-audio']]))
    expect(copy.meta?.transcriptSourceItemId).toBe('new-audio')
    expect(transcript.meta?.transcriptSourceItemId).toBe('audio')
    expect(remapTranscriptReferences(transcript, new Map()).meta?.transcriptSourceItemId).toBe('audio')
  })

  it('keeps duplicated boards linked within the copied board', () => {
    useCanvasStore.setState({ boards: [{ id: 'b', name: 'Board', items: [audio, transcript], connections: [], viewport: { x: 0, y: 0, scale: 1 } }], activeBoardId: 'b' })
    const id = useCanvasStore.getState().duplicateBoard('b')
    const copies = useCanvasStore.getState().boards.find((board) => board.id === id)!.items
    expect(copies[1].meta?.transcriptSourceItemId).toBe(copies[0].id)
    expect(copies[0].meta?.transcriptItemId).toBe(copies[1].id)
  })

  it('remaps template pairs after JSON roundtrip and clears external source IDs for standalone templates', () => {
    const template = JSON.parse(JSON.stringify(createRelicTemplate('Interview', [audio, transcript], [])))
    let serial = 0
    const { items } = stampRelicTemplate(template, { x: 0, y: 0 }, () => `new-${serial++}`)
    expect(items[1].meta?.transcriptSourceItemId).toBe(items[0].id)
    expect(items[0].meta?.transcriptItemId).toBe(items[1].id)
    expect('originalItemId' in items[0]).toBe(false)
    const alone = stampRelicTemplate(createRelicTemplate('Text', [transcript], []), { x: 0, y: 0 })
    expect(alone.items[0].meta?.transcriptSourceItemId).toBeUndefined()
    expect(alone.items[0].meta?.transcriptOf).toBe('/voice.wav')
  })
})
