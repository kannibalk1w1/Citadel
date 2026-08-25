// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import type { Transcription, TranscriptionFailureCode } from '../../types/transcription'
import { TRANSCRIPTION_LIMITS } from '../../types/transcription'
import { getSearchResults } from '../ui/itemSearchModel'
import { parseProjectFile } from '../utils/projectSchema'
import {
  buildTranscriptItem,
  isLocalSourcePath,
  decodeAudioToPcm16,
  formatClipLength,
  isTranscribableFilename,
  pcm16FromFloat,
  transcribedMessage,
  transcriptionFailureMessage,
  transcriptSourceConnection,
} from './audioTranscription'

const audioItem: CanvasItem = {
  id: 'audio-1',
  type: 'audio',
  x: 100,
  y: 60,
  width: 320,
  height: 90,
  rotation: 0,
  zIndex: 3,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
  src: '/notes/voice.m4a',
  meta: {},
}

const transcription: Transcription = {
  ok: true,
  sourcePath: '/notes/voice.m4a',
  sourceName: 'voice.m4a',
  text: 'Remember the arches.',
  segments: [{ start: 0, end: 1.4, text: 'Remember the arches.' }],
  language: 'en',
  durationSeconds: 92,
  modelId: 'base.en-q5_1',
  characters: 20,
  words: 3,
}

afterEach(() => { vi.unstubAllGlobals() })

describe('isTranscribableFilename', () => {
  it('accepts the formats Web Audio can decode', () => {
    expect(isTranscribableFilename('voice.m4a')).toBe(true)
    expect(isTranscribableFilename('C:\\notes\\Voice Note.MP3')).toBe(true)
  })

  it('rejects everything else, so the action is not offered where it cannot work', () => {
    expect(isTranscribableFilename('reference.png')).toBe(false)
    expect(isTranscribableFilename('voice')).toBe(false)
  })
})

describe('isLocalSourcePath', () => {
  it('accepts the paths a dropped file actually has', () => {
    expect(isLocalSourcePath('C:\\notes\\voice.m4a')).toBe(true)
    expect(isLocalSourcePath('/home/me/notes/voice.m4a')).toBe(true)
  })

  it('rejects anything carrying a scheme, whatever the scheme is', () => {
    for (const src of ['https://example.com/voice.mp3', 'http://x/v.mp3', 'data:audio/mp3;base64,AA', 'blob:abc', 'file:///v.mp3']) {
      expect(isLocalSourcePath(src)).toBe(false)
    }
  })

  it('rejects an empty source rather than treating it as a path', () => {
    expect(isLocalSourcePath('   ')).toBe(false)
  })
})

describe('pcm16FromFloat', () => {
  it('maps full scale to the range 16-bit audio actually has', () => {
    const pcm = new Int16Array(pcm16FromFloat(new Float32Array([0, 1, -1])))
    expect(Array.from(pcm)).toEqual([0, 32767, -32768])
  })

  it('clamps samples that overshoot instead of wrapping them', () => {
    const pcm = new Int16Array(pcm16FromFloat(new Float32Array([2, -2])))
    expect(Array.from(pcm)).toEqual([32767, -32768])
  })

  it('rounds rather than truncating, so a quiet recording keeps its level', () => {
    const pcm = new Int16Array(pcm16FromFloat(new Float32Array([0.00002])))
    expect(pcm[0]).toBe(1)
  })
})

describe('buildTranscriptItem', () => {
  it('is an ordinary text item placed beside its recording', () => {
    const item = buildTranscriptItem(audioItem, transcription)

    expect(item.type).toBe('text')
    expect(item.x).toBeGreaterThan(audioItem.x + audioItem.width)
    expect(item.y).toBe(audioItem.y)
    expect(item.locked).toBe(false)
    expect(item.meta?.content).toBe('Remember the arches.')
  })

  it('keeps the recording as its source, so the audio travels with an archive', () => {
    const item = buildTranscriptItem(audioItem, transcription)
    expect(item.src).toBe('/notes/voice.m4a')
    expect(item.meta?.transcriptOf).toBe('/notes/voice.m4a')
  })

  it('stores no colour, so a transcript follows a theme change', () => {
    expect(buildTranscriptItem(audioItem, transcription).meta).not.toHaveProperty('color')
  })

  it('keeps the timestamps, which cannot be recovered without transcribing again', () => {
    const item = buildTranscriptItem(audioItem, transcription)
    expect(item.meta?.transcriptSegments).toEqual(transcription.segments)
    expect(item.meta?.transcriptModel).toBe('base.en-q5_1')
  })
})

describe('a transcript on the board', () => {
  it('survives a save and reopen with its provenance intact', () => {
    const item = buildTranscriptItem(audioItem, transcription)
    const project = {
      version: '1.0.0',
      createdAt: 1,
      updatedAt: 2,
      activeBoardId: 'board-1',
      boards: [{ id: 'board-1', name: 'Board', items: [item], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    }

    expect(parseProjectFile(JSON.stringify(project)).boards[0].items[0]).toEqual(item)
  })

  it('is findable by what was said, because it is an ordinary text item', () => {
    const item = buildTranscriptItem(audioItem, transcription)

    expect(getSearchResults([item], 'arches')).toHaveLength(1)
    expect(getSearchResults([item], 'type:text')).toHaveLength(1)
    expect(getSearchResults([item], 'no such phrase')).toHaveLength(0)
  })
})

describe('transcriptSourceConnection', () => {
  it('points from the transcript back to the recording it came from', () => {
    const connection = transcriptSourceConnection('text-1', 'audio-1', '#73a8db')
    expect(connection).toMatchObject({ fromId: 'text-1', toId: 'audio-1', meaning: 'source' })
  })
})

describe('formatClipLength', () => {
  it('reads as a length rather than a timestamp', () => {
    expect(formatClipLength(9)).toBe('9s')
    expect(formatClipLength(92)).toBe('1m 32s')
    expect(formatClipLength(600)).toBe('10m 00s')
  })
})

describe('transcribedMessage', () => {
  it('says what was produced, from what', () => {
    expect(transcribedMessage(transcription)).toBe('voice.m4a transcribed: 3 words from 1m 32s')
  })

  it('counts one word as one word', () => {
    expect(transcribedMessage({ ...transcription, words: 1, durationSeconds: 2 }))
      .toBe('voice.m4a transcribed: 1 word from 2s')
  })
})

describe('transcriptionFailureMessage', () => {
  const codes: TranscriptionFailureCode[] = [
    'no-model', 'model-missing', 'engine-missing', 'unsupported-source', 'external-source',
    'too-long', 'undecodable', 'silent', 'empty', 'engine-failed', 'timeout', 'cancelled',
  ]

  it('has a sentence for every reason, so nothing fails silently', () => {
    for (const code of codes) {
      const message = transcriptionFailureMessage('voice.m4a', code)
      expect(message.length).toBeGreaterThan(10)
      expect(message).not.toContain('undefined')
    }
  })

  it('names the step that fixes a missing model', () => {
    expect(transcriptionFailureMessage('voice.m4a', 'no-model')).toContain('Settings')
    expect(transcriptionFailureMessage('voice.m4a', 'timeout')).toContain('smaller model')
  })
})

/** A stand-in for Web Audio, which jsdom does not implement. */
function fakeContexts(options: { duration: number; channelData?: Float32Array; throws?: boolean }) {
  const decoded = { duration: options.duration } as AudioBuffer
  const rendered = {
    getChannelData: () => options.channelData ?? new Float32Array([0.5, -0.5]),
  } as unknown as AudioBuffer

  return vi.fn(() => ({
    decodeAudioData: async () => {
      if (options.throws) throw new Error('no decoder')
      return decoded
    },
    createBufferSource: () => ({ buffer: null, connect: () => {}, start: () => {} }),
    destination: {},
    startRendering: async () => rendered,
  })) as unknown as (channels: number, frames: number, sampleRate: number) => OfflineAudioContext
}

const stubFetch = (): void => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
}

describe('decodeAudioToPcm16 and the network', () => {
  it('refuses a remote source without fetching it', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)

    const result = await decodeAudioToPcm16('https://example.com/voice.mp3', fakeContexts({ duration: 2 }))

    // The whole point: a shared project cannot make Citadel call out by being
    // opened and right-clicked.
    expect(fetcher).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, code: 'external-source' })
  })

  it('refuses every other scheme the same way, including a local-looking one', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)

    for (const src of ['http://x/v.mp3', 'data:audio/mpeg;base64,AAAA', 'blob:abc', 'file:///v.mp3']) {
      expect(await decodeAudioToPcm16(src, fakeContexts({ duration: 2 }))).toMatchObject({ ok: false, code: 'external-source' })
    }
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('decodeAudioToPcm16', () => {
  it('returns samples at the rate the model was trained on', async () => {
    stubFetch()
    const result = await decodeAudioToPcm16('/notes/voice.m4a', fakeContexts({ duration: 2 }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.durationSeconds).toBe(2)
    expect(Array.from(new Int16Array(result.samples))).toEqual([16384, -16384])
  })

  it('refuses a recording past the cap before rendering it into memory', async () => {
    stubFetch()
    const createContext = fakeContexts({ duration: TRANSCRIPTION_LIMITS.maxDurationSeconds + 1 })
    const result = await decodeAudioToPcm16('/notes/long.m4a', createContext)

    expect(result).toMatchObject({ ok: false, code: 'too-long' })
    // Only the decoding context was made: the resampling pass never started.
    expect(createContext).toHaveBeenCalledTimes(1)
  })

  it('names an empty recording as silent', async () => {
    stubFetch()
    expect(await decodeAudioToPcm16('/notes/empty.m4a', fakeContexts({ duration: 0 })))
      .toMatchObject({ ok: false, code: 'silent' })
  })

  it('names a file it cannot decode instead of throwing', async () => {
    stubFetch()
    expect(await decodeAudioToPcm16('/notes/odd.m4a', fakeContexts({ duration: 1, throws: true })))
      .toMatchObject({ ok: false, code: 'undecodable' })
  })

  it('names a file it cannot read at all', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('missing') }))
    expect(await decodeAudioToPcm16('/notes/gone.m4a', fakeContexts({ duration: 1 })))
      .toMatchObject({ ok: false, code: 'undecodable' })
  })
})
