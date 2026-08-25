// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import type { TranscriptionResult } from '../../types/transcription'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useInscriptionToastStore } from '../ui/toasts/inscriptionToastStore'
import { useTranscriptionProgressStore } from '../ui/transcriptionProgressStore'
import { transcribeAudioItem } from './transcribeAudioItem'
import { decodeAudioToPcm16 } from './audioTranscription'

// Web Audio is not in jsdom, and the decode has its own tests next door. Only
// the flow around it is under test here.
vi.mock('./audioTranscription', async (importOriginal) => ({
  ...await importOriginal<typeof import('./audioTranscription')>(),
  decodeAudioToPcm16: vi.fn(),
}))

const audioItem: CanvasItem = {
  id: 'audio-1',
  type: 'audio',
  x: 0,
  y: 0,
  width: 300,
  height: 80,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
  src: '/notes/voice.m4a',
  meta: { title: 'voice' },
}

const spoken: TranscriptionResult = {
  ok: true,
  sourcePath: '/notes/voice.m4a',
  sourceName: 'voice.m4a',
  text: 'Remember the arches.',
  segments: [{ start: 0, end: 1.4, text: 'Remember the arches.' }],
  language: 'en',
  durationSeconds: 12,
  modelId: 'base.en-q5_1',
  characters: 20,
  words: 3,
}

const invoke = vi.fn()

beforeEach(() => {
  invoke.mockReset()
  vi.mocked(decodeAudioToPcm16).mockResolvedValue({
    ok: true,
    samples: new Int16Array([1, 2, 3]).buffer,
    durationSeconds: 12,
  })
  vi.stubGlobal('ipc', { invoke })
  Object.assign(window, { ipc: { invoke } })

  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Board',
      items: [audioItem],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useHistoryStore.setState({ events: [], cursor: -1 })
  useInscriptionToastStore.setState({ toasts: [] })
  useTranscriptionProgressStore.setState({ run: null })
})

const toastTexts = (): string[] => useInscriptionToastStore.getState().toasts.map((toast) => toast.text)
const eventTypes = (): string[] => useHistoryStore.getState().events.map((event) => event.type)

describe('transcribeAudioItem', () => {
  it('adds the transcript as a text item connected to the recording', async () => {
    invoke.mockResolvedValue(spoken)

    await transcribeAudioItem(audioItem)

    const board = useCanvasStore.getState().boards[0]
    const transcript = board.items.find((item) => item.type === 'text')
    expect(transcript?.meta?.content).toBe('Remember the arches.')
    expect(board.connections).toHaveLength(1)
    expect(board.connections[0]).toMatchObject({ fromId: transcript?.id, toId: 'audio-1', meaning: 'source' })
    expect(useCanvasStore.getState().selectedIds).toEqual([transcript?.id])
  })

  it('records the transcript on the audio so a second run is a visible choice', async () => {
    invoke.mockResolvedValue(spoken)

    await transcribeAudioItem(audioItem)

    const audio = useCanvasStore.getState().boards[0].items.find((item) => item.id === 'audio-1')
    expect(audio?.meta?.transcriptItemId).toEqual(expect.any(String))
    expect(audio?.meta?.transcribedAt).toEqual(expect.any(Number))
    // The meta it already had is kept, not replaced.
    expect(audio?.meta?.title).toBe('voice')
  })

  it('pushes events for everything it added, so one undo is not left half-done', async () => {
    invoke.mockResolvedValue(spoken)

    await transcribeAudioItem(audioItem)

    expect(eventTypes()).toEqual(['ITEM_ADD', 'CONNECTION_ADD', 'ITEM_STYLE'])
  })

  it('says what it produced', async () => {
    invoke.mockResolvedValue(spoken)

    await transcribeAudioItem(audioItem)

    expect(toastTexts()).toEqual(['voice.m4a transcribed: 3 words from 12s'])
  })

  it('says why nothing happened when the recogniser refuses, and adds nothing', async () => {
    invoke.mockResolvedValue({ ok: false, code: 'no-model', reason: 'x' })

    await transcribeAudioItem(audioItem)

    expect(useCanvasStore.getState().boards[0].items).toHaveLength(1)
    expect(eventTypes()).toEqual([])
    expect(toastTexts()[0]).toContain('Settings')
  })

  it('stops at the decode when the file cannot be read, without troubling main', async () => {
    vi.mocked(decodeAudioToPcm16).mockResolvedValue({ ok: false, code: 'undecodable', reason: 'x' })

    await transcribeAudioItem(audioItem)

    expect(invoke).not.toHaveBeenCalled()
    expect(toastTexts()[0]).toContain('could not be decoded')
  })

  it('refuses an item with no audio behind it', async () => {
    await transcribeAudioItem({ ...audioItem, src: undefined })

    expect(invoke).not.toHaveBeenCalled()
    expect(toastTexts()[0]).toContain('nothing to transcribe')
  })

  it('clears the progress card whether it finished or failed', async () => {
    invoke.mockRejectedValue(new Error('bridge gone'))

    await transcribeAudioItem(audioItem)

    expect(useTranscriptionProgressStore.getState().run).toBeNull()
    expect(toastTexts()[0]).toContain('could not be transcribed')
  })

  it('places the transcript against where the audio is now, not where it started', async () => {
    invoke.mockImplementation(async () => {
      useCanvasStore.getState().updateItem('board-1', 'audio-1', { x: 900 })
      return spoken
    })

    await transcribeAudioItem(audioItem)

    const transcript = useCanvasStore.getState().boards[0].items.find((item) => item.type === 'text')
    expect(transcript?.x).toBeGreaterThan(900)
  })
})
