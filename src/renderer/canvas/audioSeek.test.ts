// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasBoard, CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useInscriptionToastStore } from '../ui/toasts/inscriptionToastStore'
import { beginProjectSession } from '../utils/projectSession'
import { AUDIO_SEEK_TIMEOUT_MS, cancelAudioSeek, findTranscriptSource, registerAudioSeekPlayer, seekTranscriptSegment, transcriptSegments, transcriptTimestamp } from './audioSeek'
import { transcriptSourceConnection } from './audioTranscription'

const audio: CanvasItem = { id: 'audio', type: 'audio', src: '/voice.wav', x: 50000, y: 50000, width: 320, height: 100, rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [] }
const transcript: CanvasItem = { ...audio, id: 'transcript', type: 'text', meta: {
  content: 'Edited words', transcriptOf: '/voice.wav', transcriptSourceItemId: 'audio', transcriptDurationSeconds: 90,
  transcriptSegments: [{ start: 12.5, end: 20, text: 'Original words' }, { start: 30, end: 35, text: 'Later words' }],
} }
const board = (items = [audio, transcript]): CanvasBoard => ({ id: 'board', name: 'Board', items, connections: [], viewport: { x: 0, y: 0, scale: 1 } })
const legacy = (): CanvasItem => ({ ...transcript, meta: { ...transcript.meta, transcriptSourceItemId: undefined } })
const messages = (): string[] => useInscriptionToastStore.getState().toasts.map((toast) => toast.text)
let dispose: Array<() => void>

function player(ready = false, src = audio.src!, itemId = audio.id): HTMLAudioElement {
  const element = document.createElement('audio')
  Object.defineProperty(element, 'readyState', { configurable: true, value: ready ? 2 : 0 })
  Object.defineProperty(element, 'duration', { configurable: true, value: ready ? 90 : NaN })
  dispose.push(registerAudioSeekPlayer('board', itemId, src, element))
  return element
}
function metadata(element: HTMLAudioElement, duration = 90): void {
  Object.defineProperty(element, 'readyState', { configurable: true, value: 2 })
  Object.defineProperty(element, 'duration', { configurable: true, value: duration })
  element.dispatchEvent(new Event('loadedmetadata'))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  dispose = []
  useCanvasStore.setState({ boards: [board()], activeBoardId: 'board', selectedIds: ['transcript'] })
  useHistoryStore.setState({ events: [], cursor: -1 })
  useInscriptionToastStore.setState({ toasts: [] })
})
afterEach(() => {
  cancelAudioSeek()
  dispose.forEach((unregister) => unregister())
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('transcript source discovery', () => {
  it('uses the durable ID even when another item shares the source path', () => {
    expect(findTranscriptSource([board([audio, { ...audio, id: 'copy' }, transcript])], 'board', transcript).source?.item.id).toBe('audio')
  })
  it('does not fall back from a missing or relinked durable source', () => {
    expect(findTranscriptSource([board([{ ...audio, id: 'copy' }, transcript])], 'board', transcript).source).toBeUndefined()
    expect(findTranscriptSource([board([{ ...audio, src: '/other.wav' }, transcript])], 'board', transcript).source).toBeUndefined()
  })
  it('can locate a durable source moved to another board', () => {
    expect(findTranscriptSource([board([transcript]), { ...board([audio]), id: 'other' }], 'board', transcript).source?.board.id).toBe('other')
  })
  it('uses a guarded legacy source connection to disambiguate paths', () => {
    const old = legacy()
    const candidate = board([audio, { ...audio, id: 'copy' }, old])
    candidate.connections = [transcriptSourceConnection(old.id, audio.id, 'var(--accent)')]
    expect(findTranscriptSource([candidate], 'board', old).source?.item.id).toBe('audio')
    candidate.items[0] = { ...audio, src: '/other.wav' }
    expect(findTranscriptSource([candidate], 'board', old).source).toBeUndefined()
  })
  it('allows only one exact legacy path match and refuses filename-only matches', () => {
    const old = legacy()
    expect(findTranscriptSource([board([audio, old])], 'board', old).source?.item.id).toBe('audio')
    expect(findTranscriptSource([board([audio, { ...audio, id: 'copy' }, old])], 'board', old).reason).toContain('More than one')
    expect(findTranscriptSource([board([{ ...audio, src: '/different/voice.wav' }, old])], 'board', old).source).toBeUndefined()
  })
  it('prefers the relocated src over historical provenance after save/load', () => {
    const relocated = { ...transcript, src: '/bundle/assets/voice.wav' }
    expect(findTranscriptSource([board([{ ...audio, src: relocated.src }, relocated])], 'board', relocated).source?.item.id).toBe('audio')
  })
  it('reports hidden sources instead of mutating their visibility', () => {
    expect(findTranscriptSource([board([{ ...audio, visible: false }, transcript])], 'board', transcript).reason).toContain('hidden')
  })
})

describe('timestamp validation', () => {
  it('keeps finite segment starts and ends in the recording range', () => {
    const invalid = [
      { start: -1, end: 1, text: 'a' }, { start: NaN, end: 1, text: 'a' },
      { start: 1, end: Infinity, text: 'a' }, { start: 2, end: 1, text: 'a' },
      { start: 1, end: 1, text: 'a' }, { start: '1', end: 2, text: 'a' },
      { start: 90, end: 91, text: 'a' }, { start: 89, end: 91, text: 'a' },
      { start: 0, end: 1, text: ' ' }, null,
    ]
    expect(transcriptSegments({ ...transcript, meta: { ...transcript.meta, transcriptSegments: [...invalid, { start: 0, end: 1, text: 'valid' }] } })).toEqual([{ start: 0, end: 1, text: 'valid' }])
  })
  it('formats seconds without rounding a segment up to the next second', () => {
    expect(transcriptTimestamp(12.9)).toBe('0:12')
    expect(transcriptTimestamp(3723)).toBe('1:02:03')
  })
})

describe('transient audio seeks', () => {
  it('waits past early duration metadata before seeking and confirms the seeked position', () => {
    const element = player()
    seekTranscriptSegment('board', 'transcript', 12.5)
    Object.defineProperty(element, 'readyState', { configurable: true, value: 1 })
    Object.defineProperty(element, 'duration', { configurable: true, value: 90 })
    element.dispatchEvent(new Event('durationchange'))
    expect(element.currentTime).toBe(0)
    Object.defineProperty(element, 'readyState', { configurable: true, value: 2 })
    Object.defineProperty(element, 'seeking', { configurable: true, value: true })
    element.dispatchEvent(new Event('loadeddata'))
    expect(element.currentTime).toBe(12.5)
    expect(messages().at(-1)).not.toContain('Audio ready')
    Object.defineProperty(element, 'seeking', { configurable: true, value: false })
    element.dispatchEvent(new Event('seeked'))
    expect(messages().at(-1)).toContain('Audio ready')
  })

  it('selects and focuses a virtualized audio item, then seeks after mount and metadata', () => {
    const items = useCanvasStore.getState().boards[0].items
    expect(seekTranscriptSegment('board', 'transcript', 12.5)).toBe(true)
    expect(useCanvasStore.getState().selectedIds).toEqual(['audio'])
    expect(useCanvasStore.getState().viewport().x).toBeLessThan(0)
    const element = player()
    expect(element.currentTime).toBe(0)
    metadata(element)
    expect(element.currentTime).toBe(12.5)
    expect(element.play).not.toHaveBeenCalled()
    expect(messages().at(-1)).toContain('Press Play')
    expect(useCanvasStore.getState().boards[0].items).toBe(items)
    expect(useHistoryStore.getState().events).toEqual([])
  })
  it('seeks an already-ready player immediately', () => {
    const element = player(true)
    seekTranscriptSegment('board', 'transcript', 12.5)
    expect(element.currentTime).toBe(12.5)
    expect(element.pause).toHaveBeenCalledTimes(1)
  })
  it('cancels older requests when another segment is chosen', () => {
    const element = player()
    seekTranscriptSegment('board', 'transcript', 12.5)
    seekTranscriptSegment('board', 'transcript', 30)
    metadata(element)
    expect(element.currentTime).toBe(30)
  })
  it.each(['relink', 'delete', 'project', 'board'] as const)('cancels a pending seek after %s', (change) => {
    const element = player()
    seekTranscriptSegment('board', 'transcript', 12.5)
    const canvas = useCanvasStore.getState()
    if (change === 'relink') canvas.updateItem('board', 'audio', { src: '/other.wav' })
    if (change === 'delete') canvas.removeItems('board', ['audio'])
    if (change === 'project') {
      beginProjectSession()
      useCanvasStore.setState({ boards: [board()] }) // Even reused IDs and paths belong to another project.
    }
    if (change === 'board') canvas.setActiveBoard('elsewhere')
    metadata(element)
    expect(element.currentTime).toBe(0)
    expect(messages().at(-1)).toContain('cancelled')
  })
  it('checks project revision at the media event even before a store update', () => {
    const element = player()
    seekTranscriptSegment('board', 'transcript', 12.5)
    beginProjectSession()
    metadata(element)
    expect(element.currentTime).toBe(0)
  })
  it('ignores an old player registration after a project replacement', () => {
    const old = player(true)
    beginProjectSession()
    useCanvasStore.setState({ boards: [board()] })
    seekTranscriptSegment('board', 'transcript', 12.5)
    expect(old.currentTime).toBe(0)
    const fresh = player(true)
    expect(fresh.currentTime).toBe(12.5)
  })
  it('survives virtualization remounts and detaches old metadata listeners', () => {
    const old = player()
    seekTranscriptSegment('board', 'transcript', 12.5)
    dispose.pop()!()
    metadata(old)
    expect(old.currentTime).toBe(0)
    const fresh = player()
    metadata(fresh)
    expect(fresh.currentTime).toBe(12.5)
  })
  it('expires pending requests and ignores metadata after timeout', () => {
    const element = player()
    seekTranscriptSegment('board', 'transcript', 12.5)
    vi.advanceTimersByTime(AUDIO_SEEK_TIMEOUT_MS)
    metadata(element)
    expect(element.currentTime).toBe(0)
    expect(messages().at(-1)).toContain('did not become ready')
  })
  it('rejects timestamps beyond the actual media duration and media failures', () => {
    const element = player()
    seekTranscriptSegment('board', 'transcript', 12.5)
    metadata(element, 10)
    expect(element.currentTime).toBe(0)
    expect(messages().at(-1)).toContain('outside')
    Object.defineProperty(element, 'readyState', { configurable: true, value: 0 })
    seekTranscriptSegment('board', 'transcript', 12.5)
    element.dispatchEvent(new Event('error'))
    expect(messages().at(-1)).toContain('could not be loaded')
  })
  it('rejects a missing source and invalid requested timestamps without moving selection', () => {
    expect(seekTranscriptSegment('board', 'transcript', Infinity)).toBe(false)
    useCanvasStore.getState().removeItems('board', ['audio'])
    expect(seekTranscriptSegment('board', 'transcript', 12.5)).toBe(false)
    expect(useCanvasStore.getState().selectedIds).toEqual(['transcript'])
    expect(messages().at(-1)).toContain('missing or has changed')
  })
})
