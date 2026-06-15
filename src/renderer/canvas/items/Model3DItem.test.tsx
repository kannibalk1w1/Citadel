// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { clearAssetMetadataForTest, recordAssetMetadata } from '../../assets/assetMetadata'
import { ensureThumbnail } from '../../assets/thumbnailPipeline'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { Model3DItem } from './Model3DItem'

const rendererConstructor = vi.fn()

vi.mock('react-konva', () => ({
  Rect: () => <div data-testid="model-konva-rect" />,
}))

vi.mock('three', () => ({
  Scene: vi.fn(function Scene(this: { add: unknown }) { this.add = vi.fn() }),
  Color: vi.fn(),
  PerspectiveCamera: vi.fn(function PerspectiveCamera(this: { position: { set: unknown }; updateProjectionMatrix: unknown }) {
    this.position = { set: vi.fn() }
    this.updateProjectionMatrix = vi.fn()
  }),
  WebGLRenderer: vi.fn(function WebGLRenderer(this: { domElement: HTMLCanvasElement; setSize: unknown; setPixelRatio: unknown; render: unknown; dispose: unknown }) {
    rendererConstructor()
    this.domElement = document.createElement('canvas')
    this.setSize = vi.fn()
    this.setPixelRatio = vi.fn()
    this.render = vi.fn()
    this.dispose = vi.fn()
  }),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(function DirectionalLight(this: { position: { set: unknown } }) {
    this.position = { set: vi.fn() }
  }),
  Object3D: vi.fn(),
  Mesh: vi.fn(function Mesh(this: { rotation: { y: number } }) { this.rotation = { y: 0 } }),
  BoxGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(),
  Box3: vi.fn(function Box3(this: { setFromObject: unknown; getCenter: unknown; getSize: unknown }) {
    this.setFromObject = vi.fn(() => this)
    this.getCenter = vi.fn(() => ({ length: () => 1 }))
    this.getSize = vi.fn(() => ({ length: () => 1 }))
  }),
  Vector3: vi.fn(),
}))

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn(function GLTFLoader(this: { load: unknown }) { this.load = vi.fn() }),
}))

vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({
  OBJLoader: vi.fn(function OBJLoader(this: { load: unknown }) { this.load = vi.fn() }),
}))

vi.mock('../../assets/thumbnailPipeline', () => ({
  ensureThumbnail: vi.fn().mockResolvedValue(undefined),
  generateModel3DPreviewThumbnail: vi.fn().mockResolvedValue('data:image/png;base64,model'),
}))

const modelItem: CanvasItem = {
  id: 'model-relic-1',
  type: 'model3d',
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
  src: 'C:/archive/relic.glb',
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  window.requestAnimationFrame = vi.fn(() => 1) as unknown as typeof window.requestAnimationFrame
  window.cancelAnimationFrame = vi.fn()
  clearAssetMetadataForTest()
  rendererConstructor.mockClear()
  vi.mocked(ensureThumbnail).mockClear()
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Chamber',
      items: [modelItem],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useUIStore.setState({ toolMode: 'select' })
})

afterEach(() => cleanup())

describe('Model3DItem preview-first rendering', () => {
  it('requests a static preview thumbnail for local model relics', () => {
    render(<Model3DItem item={modelItem} />)

    expect(ensureThumbnail).toHaveBeenCalledWith(modelItem.src, expect.any(Function))
  })

  it('renders a cached static preview instead of creating a Three renderer when small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/relic.glb', exists: true, thumbnailPath: 'C:/cache/model-preview.png' })
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<Model3DItem item={modelItem} />)

    const preview = screen.getByAltText('3D preview')
    expect(preview.getAttribute('src')).toBe('local:///C:/cache/model-preview.png')
    expect(rendererConstructor).not.toHaveBeenCalled()
  })

  it('creates the Three renderer for selected relics even when small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/relic.glb', exists: true, thumbnailPath: 'C:/cache/model-preview.png' })
    useCanvasStore.setState((state) => ({
      selectedIds: [modelItem.id],
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<Model3DItem item={modelItem} />)

    expect(rendererConstructor).toHaveBeenCalledTimes(1)
    expect(screen.queryByAltText('3D preview')).toBeNull()
  })
})
