// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeMachine } from './TimeMachine'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'
import { captureBoardThumbnail } from '../export/exportCanvas'

// jsdom has no canvas backend at all, so both the stage being read and the
// scratch canvas being drawn into need a stubbed 2D context. Patching the
// prototype covers both and still lets the real scaling maths run.
const realGetContext = HTMLCanvasElement.prototype.getContext
const realToDataURL = HTMLCanvasElement.prototype.toDataURL

function stubCanvasBackend(): void {
  HTMLCanvasElement.prototype.getContext = (() => ({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
  })) as unknown as typeof realGetContext
  HTMLCanvasElement.prototype.toDataURL = (() => 'data:image/jpeg;base64,frame') as typeof realToDataURL
}

function stubStageCanvas(width: number, height: number): void {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  document.body.appendChild(canvas)
}

describe('captureBoardThumbnail', () => {
  beforeEach(stubCanvasBackend)

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = realGetContext
    HTMLCanvasElement.prototype.toDataURL = realToDataURL
    document.body.innerHTML = ''
  })

  it('scales a wide stage down to the thumbnail budget, keeping its shape', () => {
    stubStageCanvas(640, 400)

    expect(captureBoardThumbnail(320)).toEqual({
      dataUrl: 'data:image/jpeg;base64,frame',
      width: 320,
      height: 200,
    })
  })

  it('never upscales a stage that is already smaller than the budget', () => {
    stubStageCanvas(200, 100)

    expect(captureBoardThumbnail(320)).toMatchObject({ width: 200, height: 100 })
  })

  it('returns null rather than throwing when there is no stage to capture', () => {
    expect(captureBoardThumbnail()).toBeNull()
  })
})

describe('the filmstrip', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useCanvasStore.setState({
      boards: [{ id: 'board-1', name: 'Chamber', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
      activeBoardId: 'board-1',
      selectedIds: [],
    })
    useUIStore.setState({ panels: { ...useUIStore.getState().panels, timeMachine: true } })
    useHistoryStore.getState().resetHistory()
  })

  const pushEvent = (): string => useHistoryStore.getState().push('ITEM_ADD', 'board-1', null, { id: 'i' }).id

  it('anchors a snapshot to the event the cursor sits on', () => {
    const eventId = pushEvent()

    const snapshot = useHistoryStore.getState().addSnapshot({
      boardId: 'board-1', dataUrl: 'data:image/jpeg;base64,a', width: 320, height: 200, takenAt: Date.now(),
    })

    expect(snapshot.eventId).toBe(eventId)
  })

  it('shows a frame per save and travels the board when one is clicked', () => {
    pushEvent()
    useHistoryStore.getState().addSnapshot({
      boardId: 'board-1', dataUrl: 'data:image/jpeg;base64,a', width: 320, height: 200, takenAt: Date.now(),
    })
    pushEvent()
    useHistoryStore.getState().addSnapshot({
      boardId: 'board-1', dataUrl: 'data:image/jpeg;base64,b', width: 320, height: 200, takenAt: Date.now(),
    })

    render(<TimeMachine />)
    const frames = screen.getAllByRole('button', { name: /^Saved at/ })
    expect(frames).toHaveLength(2)

    // Second event is cursor 1; clicking the first frame walks back to cursor 0.
    expect(useHistoryStore.getState().cursor).toBe(1)
    fireEvent.click(frames[0])
    expect(useHistoryStore.getState().cursor).toBe(0)
  })

  it('hides frames belonging to another board', () => {
    pushEvent()
    useHistoryStore.getState().addSnapshot({
      boardId: 'board-2', dataUrl: 'data:image/jpeg;base64,other', width: 320, height: 200, takenAt: Date.now(),
    })

    render(<TimeMachine />)

    expect(screen.queryByLabelText('Saved states')).toBeNull()
  })

  it('forgets its frames when the history is reset', () => {
    pushEvent()
    useHistoryStore.getState().addSnapshot({
      boardId: 'board-1', dataUrl: 'data:image/jpeg;base64,a', width: 320, height: 200, takenAt: Date.now(),
    })

    useHistoryStore.getState().resetHistory()

    expect(useHistoryStore.getState().snapshots).toEqual([])
  })
})
