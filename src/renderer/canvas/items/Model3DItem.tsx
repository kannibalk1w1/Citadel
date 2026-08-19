// Model3DItem: Three.js scene rendered into a DOM canvas synced to viewport.
import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { Rect } from 'react-konva'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import type { CanvasItem } from '../../../types'
import { useAssetMetadata } from '../../assets/assetMetadata'
import { preferThumbnail } from '../../assets/previewPolicy'
import { ensureThumbnail, generateModel3DPreviewThumbnail } from '../../assets/thumbnailPipeline'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { adoptSelectTool, handleRelicToolPress } from './relicPointer'
import { DOMItem } from './DOMItem'
import { MediaPlaceholder } from './MediaPlaceholder'

type Props = { item: CanvasItem; domOnly?: boolean }

export function Model3DItem({ item, domOnly = false }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const scale = useCanvasStore((s) => s.viewport().scale)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const toolMode = useUIStore((s) => s.toolMode)
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const meta = useAssetMetadata(item.src)
  const usePreview = preferThumbnail(item.width * scale, item.height * scale, isSelected) && !!meta?.thumbnailPath

  useEffect(() => {
    if (!item.src) return
    void ensureThumbnail(item.src, generateModel3DPreviewThumbnail)
  }, [item.src])

  const handleDomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (!activeBoardId) return

    if (handleRelicToolPress(toolMode, activeBoardId, item)) return
    adoptSelectTool(toolMode)
    if (e.shiftKey) {
      useCanvasStore.getState().addToSelection(item.id)
    } else {
      setSelection([item.id])
    }
  }

  useEffect(() => {
    if (!mountRef.current || usePreview) return
    const w = mountRef.current.clientWidth || item.width
    const h = mountRef.current.clientHeight || item.height

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x070808)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    camera.position.set(0, 1, 3)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h, false)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(2, 4, 3)
    scene.add(dirLight)

    // Placeholder box — replaced when model loads
    let pivotObj: THREE.Object3D = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: 0x505050 })
    )
    scene.add(pivotObj)

    let animId: number
    let autoRotate = true

    const animate = () => {
      animId = requestAnimationFrame(animate)
      if (autoRotate) pivotObj.rotation.y += 0.005
      renderer.render(scene, camera)
    }
    animate()

    // Load model if src is provided
    setLoadError(null)
    if (item.src) {
      const ext = item.src.split('.').pop()?.toLowerCase()
      // Resolve src through the local:// protocol for file paths
      const url = item.src.startsWith('http') ? item.src : `local:///${item.src.replace(/\\/g, '/')}`

      if (ext === 'glb' || ext === 'gltf') {
        const loader = new GLTFLoader()
        loader.load(url, (gltf) => {
          scene.remove(pivotObj)
          pivotObj = gltf.scene
          // Centre and fit the model in view
          const box = new THREE.Box3().setFromObject(pivotObj)
          const centre = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3()).length()
          pivotObj.position.sub(centre)
          camera.position.set(0, 0, size * 1.2)
          camera.near = size * 0.01
          camera.far = size * 100
          camera.updateProjectionMatrix()
          scene.add(pivotObj)
        }, undefined, (err) => { console.error('GLTFLoader error', err); setLoadError('3D file failed') })
      } else if (ext === 'obj') {
        const loader = new OBJLoader()
        loader.load(url, (obj) => {
          scene.remove(pivotObj)
          pivotObj = obj
          const box = new THREE.Box3().setFromObject(pivotObj)
          const centre = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3()).length()
          pivotObj.position.sub(centre)
          camera.position.set(0, 0, size * 1.2)
          camera.near = size * 0.01
          camera.far = size * 100
          camera.updateProjectionMatrix()
          scene.add(pivotObj)
        }, undefined, (err) => { console.error('OBJLoader error', err); setLoadError('3D file failed') })
      }
    }

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      rendererRef.current = null
      cameraRef.current = null
      if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  }, [item.src, usePreview])

  useLayoutEffect(() => {
    const mount = mountRef.current
    const renderer = rendererRef.current
    const camera = cameraRef.current
    if (!mount || !renderer || !camera) return
    const width = Math.max(1, mount.clientWidth || item.width)
    const height = Math.max(1, mount.clientHeight || item.height)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }, [item.width, item.height])

  return (
    <>
      {!domOnly && (
        <Rect
          x={item.x} y={item.y}
          width={item.width} height={item.height}
          rotation={item.rotation}
          opacity={0}
          onClick={(e) => { e.cancelBubble = true; setSelection([item.id]) }}
        />
      )}
      <DOMItem
        item={item}
        editableFrame
        onClick={handleDomClick}
      >
        {usePreview ? (
          <img
            src={pathToUrl(meta?.thumbnailPath ?? '')}
            alt="3D preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#070808', display: 'block' }}
          />
        ) : (
          <>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            <MediaPlaceholder item={item} label={loadError} />
          </>
        )}
      </DOMItem>
    </>
  )
}
