// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { seekTranscriptSegment } from '../../canvas/audioSeek'
import { TranscriptPanel } from './TranscriptPanel'

vi.mock('../../canvas/audioSeek', async (original) => ({
  ...await original<typeof import('../../canvas/audioSeek')>(), seekTranscriptSegment: vi.fn(),
}))
const audio: CanvasItem = { id: 'audio', type: 'audio', src: '/voice.wav', x: 0, y: 0, width: 300, height: 100, rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [] }
const transcript: CanvasItem = { ...audio, id: 'text', type: 'text', meta: {
  content: 'Edited transcript words', transcriptOf: audio.src, transcriptSourceItemId: audio.id,
  transcriptSegments: [{ start: 12.5, end: 20, text: 'Original spoken words' }],
} }
beforeEach(() => {
  vi.clearAllMocks()
  useCanvasStore.setState({ boards: [{ id: 'board', name: 'Board', items: [audio, transcript], connections: [], viewport: { x: 0, y: 0, scale: 1 } }], activeBoardId: 'board' })
})
afterEach(cleanup)

describe('TranscriptPanel', () => {
  it('shows accessible timestamp buttons for original segments rather than edited text', () => {
    render(<TranscriptPanel item={transcript} boardId="board" />)
    expect(screen.getByRole('region', { name: 'Original recording transcript' })).toBeTruthy()
    expect(screen.getByText(/Edits to the text item do not change them/)).toBeTruthy()
    expect(screen.queryByText('Edited transcript words')).toBeNull()
    const button = screen.getByRole('button', { name: 'Go to audio at 0:12: Original spoken words' })
    expect(button.getAttribute('type')).toBe('button')
    fireEvent.click(button)
    expect(seekTranscriptSegment).toHaveBeenCalledWith('board', 'text', 12.5)
  })
  it('disables source navigation and explains a missing recording', () => {
    useCanvasStore.getState().removeItems('board', ['audio'])
    render(<TranscriptPanel item={transcript} boardId="board" />)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('missing or has changed')
  })
  it('omits malformed timestamps while keeping the editable text separate', () => {
    render(<TranscriptPanel item={{ ...transcript, meta: { ...transcript.meta, transcriptSegments: [{ start: NaN, end: 20, text: 'Invalid' }] } }} boardId="board" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('No usable timestamps are available.')).toBeTruthy()
  })
  it('does not appear for ordinary text or audio items', () => {
    const view = render(<TranscriptPanel item={audio} boardId="board" />)
    expect(view.container.innerHTML).toBe('')
    view.rerender(<TranscriptPanel item={{ ...transcript, meta: { content: 'A plain text item' } }} boardId="board" />)
    expect(view.container.innerHTML).toBe('')
  })
})
