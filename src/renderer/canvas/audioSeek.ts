import type { CanvasBoard, CanvasItem } from '../../types'
import type { TranscriptionSegment } from '../../types/transcription'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { projectSessionRevision } from '../utils/projectSession'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { focusViewportFor } from '../presentation/presentationNavigation'

export const AUDIO_SEEK_TIMEOUT_MS = 15000

/** Project metadata is untrusted, including timestamps from older recognisers. */
export function transcriptSegments(item: CanvasItem): TranscriptionSegment[] {
  const segments = item.meta?.transcriptSegments
  const duration = item.meta?.transcriptDurationSeconds
  if (!Array.isArray(segments)) return []
  return segments.filter((segment): segment is TranscriptionSegment => (
    segment !== null && typeof segment === 'object'
    && typeof segment.text === 'string' && segment.text.trim().length > 0
    && typeof segment.start === 'number' && Number.isFinite(segment.start) && segment.start >= 0
    && typeof segment.end === 'number' && Number.isFinite(segment.end) && segment.end > segment.start
    && (!(typeof duration === 'number' && Number.isFinite(duration) && duration > 0)
      || (segment.start < duration && segment.end <= duration))
  ))
}

export function transcriptTimestamp(seconds: number): string {
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor(whole / 60) % 60
  const tail = `${String(minutes).padStart(hours ? 2 : 1, '0')}:${String(whole % 60).padStart(2, '0')}`
  return hours ? `${hours}:${tail}` : tail
}

type AudioSource = { board: CanvasBoard; item: CanvasItem }
export type TranscriptSource = { source: AudioSource; reason?: never } | { source?: never; reason: string }

/** Never guess by filename or silently replace a missing durable reference. */
export function findTranscriptSource(boards: CanvasBoard[], boardId: string, transcript: CanvasItem): TranscriptSource {
  const board = boards.find((candidate) => candidate.id === boardId)
  // src is rewritten by project save/load; transcriptOf is historical provenance.
  const path = transcript.src || transcript.meta?.transcriptOf
  const unavailable = { reason: 'The source audio is missing or has changed. Restore the original recording to use these timestamps.' }
  if (!board || typeof path !== 'string' || !path.trim()) return unavailable
  const matches = (item: CanvasItem): boolean => item.type === 'audio' && item.src === path
  const durableId = transcript.meta?.transcriptSourceItemId
  let source: AudioSource | undefined
  if (typeof durableId === 'string' && durableId) {
    const candidates = boards.flatMap((candidate) => candidate.items
      .filter((item) => item.id === durableId)
      .map((item) => ({ board: candidate, item })))
    if (candidates.length !== 1 || !matches(candidates[0].item)) return unavailable
    source = candidates[0]
  } else {
    const sourceLinks = board.connections.filter((connection) => connection.meaning === 'source'
      && connection.fromId === transcript.id)
    const linkedIds = new Set(sourceLinks.map((connection) => connection.toId))
    const candidates = board.items.filter((item) => matches(item)
      && (sourceLinks.length === 0 || linkedIds.has(item.id)))
    if (candidates.length !== 1) return candidates.length > 1
      ? { reason: 'More than one audio item matches this transcript. Keep one source connection to the original recording.' }
      : unavailable
    source = { board, item: candidates[0] }
  }
  if (source.item.visible === false) return { reason: 'The source audio is hidden. Show it on the board to use these timestamps.' }
  return { source }
}

type Player = { boardId: string; itemId: string; src: string; revision: number; audio: HTMLAudioElement }
type SeekRequest = {
  revision: number
  transcriptBoardId: string
  transcriptId: string
  boardId: string
  itemId: string
  src: string
  seconds: number
}
const players = new Set<Player>()
let pending: SeekRequest | null = null
let cleanupRequest: (() => void) | null = null
let detachMedia: (() => void) | null = null

export function cancelAudioSeek(): void {
  pending = null
  detachMedia?.()
  detachMedia = null
  cleanupRequest?.()
  cleanupRequest = null
}

function finish(request: SeekRequest, message: string, failed = false): void {
  if (pending !== request) return
  cancelAudioSeek()
  inscribe(message, failed ? { tone: 'danger' } : undefined)
}

function requestIsCurrent(request: SeekRequest): boolean {
  const canvas = useCanvasStore.getState()
  if (request.revision !== projectSessionRevision() || canvas.activeBoardId !== request.boardId) return false
  const transcript = canvas.boards.find((board) => board.id === request.transcriptBoardId)
    ?.items.find((item) => item.id === request.transcriptId)
  if (!transcript || !transcriptSegments(transcript).some((segment) => segment.start === request.seconds)) return false
  const result = findTranscriptSource(canvas.boards, request.transcriptBoardId, transcript)
  return !!result.source && result.source.board.id === request.boardId
    && result.source.item.id === request.itemId && result.source.item.src === request.src
}

function connectPendingPlayer(): void {
  const request = pending
  if (!request) return
  if (!requestIsCurrent(request)) {
    finish(request, 'Audio seek cancelled because the source or project changed.', true)
    return
  }
  const player = [...players].find((candidate) => candidate.revision === request.revision
    && candidate.boardId === request.boardId && candidate.itemId === request.itemId && candidate.src === request.src)
  if (!player || detachMedia) return
  const { audio } = player
  let seeking = false
  let attempts = 0
  const complete = (): void => {
    if (pending !== request) return
    if (!requestIsCurrent(request)) {
      finish(request, 'Audio seek cancelled because the source or project changed.', true)
      return
    }
    if (Math.abs(audio.currentTime - request.seconds) < 0.1) {
      finish(request, `Audio ready at ${transcriptTimestamp(request.seconds)}. Press Play on the audio item to listen.`)
    } else {
      seeking = false
      if (attempts >= 2) finish(request, 'The source audio could not reach this timestamp. Try again once it has loaded.', true)
      else seek()
    }
  }
  const seek = (): void => {
    if (pending !== request) return
    if (!requestIsCurrent(request)) {
      finish(request, 'Audio seek cancelled because the source or project changed.', true)
      return
    }
    if (audio.readyState < 1 || !Number.isFinite(audio.duration)) return
    if (audio.duration <= 0 || request.seconds >= audio.duration) {
      finish(request, 'This timestamp is outside the source recording.', true)
      return
    }
    // Chromium can report duration before it has a playable frame. A seek in
    // durationchange/loadedmetadata at HAVE_METADATA can silently clamp to 0.
    if (audio.readyState < 2 || seeking) return
    try {
      // No autoplay: metadata may arrive after the browser's user activation expires.
      // Seeking never creates a Web Audio graph, and existing playback is paused.
      audio.pause()
      seeking = true
      attempts++
      audio.currentTime = request.seconds
      if (!audio.seeking) complete()
    } catch {
      finish(request, 'The source audio could not seek to this timestamp.', true)
    }
  }
  const error = (): void => finish(request, 'The source audio could not be loaded. Check that the recording is available.', true)
  audio.addEventListener('loadedmetadata', seek)
  audio.addEventListener('durationchange', seek)
  audio.addEventListener('loadeddata', seek)
  audio.addEventListener('canplay', seek)
  audio.addEventListener('seeked', complete)
  audio.addEventListener('error', error)
  detachMedia = () => {
    audio.removeEventListener('loadedmetadata', seek)
    audio.removeEventListener('durationchange', seek)
    audio.removeEventListener('loadeddata', seek)
    audio.removeEventListener('canplay', seek)
    audio.removeEventListener('seeked', complete)
    audio.removeEventListener('error', error)
  }
  if (audio.error) error()
  else seek()
}

/** A registration lives exactly as long as its DOM player, never a second media graph. */
export function registerAudioSeekPlayer(boardId: string, itemId: string, src: string, audio: HTMLAudioElement): () => void {
  const player = { boardId, itemId, src, audio, revision: projectSessionRevision() }
  players.add(player)
  connectPendingPlayer()
  return () => {
    players.delete(player)
    if (pending?.boardId === boardId && pending.itemId === itemId && pending.src === src) {
      detachMedia?.()
      detachMedia = null
      // Virtualization can unmount and remount the same source while it is loading.
      connectPendingPlayer()
    }
  }
}

/** A transient navigation command: no item edits and no history/recording events. */
export function seekTranscriptSegment(boardId: string, transcriptId: string, seconds: number): boolean {
  cancelAudioSeek()
  const canvas = useCanvasStore.getState()
  const transcript = canvas.boards.find((board) => board.id === boardId)?.items.find((item) => item.id === transcriptId)
  if (!transcript || !transcriptSegments(transcript).some((segment) => segment.start === seconds)) {
    inscribe('This transcript has no valid timestamp for that segment.', { tone: 'danger' })
    return false
  }
  const result = findTranscriptSource(canvas.boards, boardId, transcript)
  if (!result.source) {
    inscribe(result.reason, { tone: 'danger' })
    return false
  }
  const { board, item } = result.source
  const request: SeekRequest = {
    revision: projectSessionRevision(), transcriptBoardId: boardId, transcriptId,
    boardId: board.id, itemId: item.id, src: item.src!, seconds,
  }
  // Wake a virtualized DOM item before waiting for its player registration.
  useUIStore.getState().setToolMode('select')
  if (canvas.activeBoardId !== board.id) canvas.setActiveBoard(board.id)
  canvas.setSelection([item.id])
  canvas.updateViewport(focusViewportFor(item, { width: window.innerWidth, height: window.innerHeight }))
  pending = request
  const unsubscribe = useCanvasStore.subscribe(() => {
    if (pending === request && !requestIsCurrent(request)) {
      finish(request, 'Audio seek cancelled because the source or project changed.', true)
    }
  })
  const timeout = setTimeout(() => finish(request, 'The source audio did not become ready. Check the recording and try again.', true), AUDIO_SEEK_TIMEOUT_MS)
  cleanupRequest = () => { unsubscribe(); clearTimeout(timeout) }
  inscribe(`Finding audio at ${transcriptTimestamp(seconds)}. Playback stays paused.`)
  connectPendingPlayer()
  return true
}
