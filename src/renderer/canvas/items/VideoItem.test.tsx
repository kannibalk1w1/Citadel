// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { clearAssetMetadataForTest, recordAssetMetadata } from '../../assets/assetMetadata'
import { ensureThumbnail } from '../../assets/thumbnailPipeline'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { VideoItem } from './VideoItem'

vi.mock('react-konva', () => ({
  Rect: () => <div data-testid="video-konva-rect" />,
}))

vi.mock('../../assets/thumbnailPipeline', () => ({
  ensureThumbnail: vi.fn().mockResolvedValue(undefined),
  generateVideoPosterThumbnail: vi.fn().mockResolvedValue('data:image/png;base64,video'),
}))

const videoItem: CanvasItem = {
  id: 'video-relic-1',
  type: 'video',
  x: 20,
  y: 30,
  width: 320,
  height: 180,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: ['sigil'],
  src: 'C:/archive/memory.mp4',
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  clearAssetMetadataForTest()
  vi.mocked(ensureThumbnail).mockClear()
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Chamber',
      items: [videoItem],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useUIStore.setState({ toolMode: 'select' })
})

afterEach(() => cleanup())

describe('VideoItem poster-first rendering', () => {
  it('requests a poster thumbnail for local video relics', () => {
    render(<VideoItem item={videoItem} />)

    expect(ensureThumbnail).toHaveBeenCalledWith(videoItem.src, expect.any(Function))
  })

  it('renders a cached poster image instead of the video when small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.mp4', exists: true, thumbnailPath: 'C:/cache/video-poster.png' })
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<VideoItem item={videoItem} />)

    const poster = screen.getByAltText('Video poster')
    expect(poster.getAttribute('src')).toBe('local:///C:/cache/video-poster.png')
    expect(document.querySelector('video')).toBeNull()
  })

  it('offers a drag handle when selected, without covering the video', () => {
    useCanvasStore.setState({ selectedIds: [videoItem.id] })

    render(<VideoItem item={videoItem} />)

    // Video items had no move affordance at all until 2026-08-15.
    expect(screen.getByTitle('Move')).toBeTruthy()
    expect(document.querySelector('video')).toBeTruthy()
  })

  it('renders the full video for selected relics even when small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.mp4', exists: true, thumbnailPath: 'C:/cache/video-poster.png' })
    useCanvasStore.setState((state) => ({
      selectedIds: [videoItem.id],
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<VideoItem item={videoItem} />)

    expect(document.querySelector('video')?.getAttribute('src')).toBe('local:///C:/archive/memory.mp4')
    expect(screen.queryByAltText('Video poster')).toBeNull()
  })
})
