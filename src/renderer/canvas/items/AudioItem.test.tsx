// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { AudioItem } from './AudioItem'
import { beginProjectSession } from '../../utils/projectSession'
import { cancelAudioSeek, seekTranscriptSegment } from '../audioSeek'

vi.mock('react-konva', () => ({
  Rect: () => <div data-testid="audio-konva-rect" />,
}))

vi.mock('./DOMItem', () => ({
  DOMItem: ({ children }: { children: React.ReactNode }) => <div data-testid="audio-dom-item">{children}</div>,
}))

const audioItem: CanvasItem = {
  id: 'audio-relic-1',
  type: 'audio',
  x: 20,
  y: 30,
  width: 320,
  height: 180,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
  src: 'C:/archive/memory.mp3',
}

type AudioContextMock = {
  state: 'running' | 'closed'
  destination: object
  createAnalyser: any
  createMediaElementSource: any
  close: any
}

let contexts: AudioContextMock[]
let frameCallbacks: FrameRequestCallback[]
let canvasContext: Record<string, ReturnType<typeof vi.fn>>
let getContext: { mockRestore: () => void; mock: { calls: unknown[][] } }
let pause: { mockRestore: () => void; mock: { calls: unknown[][]; instances: unknown[] } }

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  contexts = []
  frameCallbacks = []
  canvasContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  }
  getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D)
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frameCallbacks.push(callback)
    return frameCallbacks.length
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('AudioContext', vi.fn(() => {
    const analyser = {
      frequencyBinCount: 4,
      getByteTimeDomainData: vi.fn((data: Uint8Array) => data.fill(128)),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    const source = { connect: vi.fn(), disconnect: vi.fn() }
    const context: AudioContextMock = {
      state: 'running',
      destination: {},
      createAnalyser: vi.fn(() => analyser),
      createMediaElementSource: vi.fn(() => source),
      close: vi.fn(async () => { context.state = 'closed' }),
    }
    contexts.push(context)
    return context
  }))
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Chamber',
      items: [audioItem],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useUIStore.setState({ toolMode: 'select' })
})

afterEach(() => {
  cancelAudioSeek()
  cleanup()
  getContext.mockRestore()
  pause.mockRestore()
  vi.unstubAllGlobals()
})

describe('AudioItem lifecycle', () => {
  it('reuses the waveform buffer and canvas backing store between frames', () => {
    const { container } = render(<AudioItem item={audioItem} />)
    const canvas = container.querySelector('canvas')!
    let widthWrites = 0
    let heightWrites = 0
    let width = canvas.width
    let height = canvas.height
    Object.defineProperty(canvas, 'width', { configurable: true, get: () => width, set: (value: number) => { widthWrites += 1; width = value } })
    Object.defineProperty(canvas, 'height', { configurable: true, get: () => height, set: (value: number) => { heightWrites += 1; height = value } })

    fireEvent.play(container.querySelector('audio')!)
    const firstFrame = frameCallbacks.shift()!
    firstFrame(0)
    const analyser = contexts[0].createAnalyser.mock.results[0].value
    firstFrame(0)

    const buffers = analyser.getByteTimeDomainData.mock.calls.map(([data]: [unknown]) => data)
    expect(new Set(buffers).size).toBe(1)
    expect(widthWrites).toBe(0)
    expect(heightWrites).toBe(0)
    expect(getContext).toHaveBeenCalledTimes(1)
  })

  it('closes the old graph and keys the media element when the source changes', () => {
    const { container, rerender, unmount } = render(<AudioItem item={audioItem} />)
    const oldAudio = container.querySelector('audio')!
    fireEvent.play(oldAudio)

    const nextItem = { ...audioItem, src: 'C:/archive/other.mp3' }
    rerender(<AudioItem item={nextItem} />)

    expect(contexts[0].close).toHaveBeenCalledTimes(1)
    expect(contexts[0].createMediaElementSource.mock.results[0].value.disconnect).toHaveBeenCalledTimes(1)
    expect(pause.mock.instances[0]).toBe(oldAudio)
    const newAudio = container.querySelector('audio')!
    expect(newAudio).not.toBe(oldAudio)

    fireEvent.play(newAudio)
    expect(contexts).toHaveLength(2)
    expect(contexts[0].createMediaElementSource).toHaveBeenCalledWith(oldAudio)
    expect(contexts[1].createMediaElementSource).toHaveBeenCalledWith(newAudio)

    unmount()
    expect(contexts[1].close).toHaveBeenCalledTimes(1)
    expect(pause.mock.instances.at(-1)).toBe(newAudio)
  })

  it('ignores a late play event from an element whose effect has been cleaned up', () => {
    const { container, unmount } = render(<AudioItem item={audioItem} />)
    const oldAudio = container.querySelector('audio')!
    unmount()

    fireEvent.play(oldAudio)

    expect(contexts).toHaveLength(0)
    expect(frameCallbacks).toHaveLength(0)
  })
})


describe('AudioItem transcript seeking', () => {
  it('registers a mounted player and waits for metadata without creating a media graph', () => {
    const transcript: CanvasItem = { ...audioItem, id: 'transcript', type: 'text', meta: {
      transcriptSourceItemId: audioItem.id,
      transcriptSegments: [{ start: 12.5, end: 20, text: 'Original words' }],
    } }
    useCanvasStore.getState().addItem('board-1', transcript)
    seekTranscriptSegment('board-1', transcript.id, 12.5)
    const { container } = render(<AudioItem item={audioItem} />)
    const audio = container.querySelector('audio')!
    expect(audio.currentTime).toBe(0)
    expect(audio.preload).toBe('metadata')
    Object.defineProperty(audio, 'readyState', { configurable: true, value: 2 })
    Object.defineProperty(audio, 'duration', { configurable: true, value: 90 })
    fireEvent.loadedMetadata(audio)
    expect(audio.currentTime).toBe(12.5)
    expect(contexts).toHaveLength(0)
    expect(frameCallbacks).toHaveLength(0)
  })

  it('replaces the player and closes its graph on a new project with identical IDs and paths', () => {
    const { container, rerender } = render(<AudioItem item={audioItem} />)
    const oldAudio = container.querySelector('audio')!
    fireEvent.play(oldAudio)
    beginProjectSession()
    rerender(<AudioItem item={{ ...audioItem }} />)
    expect(container.querySelector('audio')).not.toBe(oldAudio)
    expect(contexts[0].close).toHaveBeenCalledTimes(1)
    expect(contexts[0].createMediaElementSource.mock.results[0].value.disconnect).toHaveBeenCalledTimes(1)
    fireEvent.play(oldAudio)
    expect(contexts).toHaveLength(1)
  })
})
