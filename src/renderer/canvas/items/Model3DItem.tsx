// Model3DItem: Three.js scene rendered into a DOM canvas synced to viewport.
import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { Rect } from 'react-konva'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { DOMItem } from './DOMItem'
import { MediaPlaceholder } from './MediaPlaceholder'

type Props = { item: CanvasItem; domOnly?: boolean }

export function Model3DItem({ item, domOnly = false }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const toolMode = useUIStore((s) => s.toolMode)
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const handleDomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (!activeBoardId) return

    if (toolMode === 'connect') {
      const ui = useUIStore.getState()
      const canvas = useCanvasStore.getState()
      if (!ui.connectFromId) {
        ui.setConnectFromId(item.id)
      } else if (ui.connectFromId !== item.id) {
        const conn: Connection = {
          id: nanoid(),
          fromId: ui.connectFromId,
          toId: item.id,
          fromAnchor: 'auto',
          toAnchor: 'auto',
          style: 'bezier',
          color: '#b99455',
          width: 1.5,
          arrowHead: 'arrow',
          dashed: false,
        }
        canvas.addConnection(activeBoardId, conn)
        useHistoryStore.getState().push('CONNECTION_ADD', activeBoardId, null, conn)
        ui.setConnectFromId(null)
        ui.setToolMode('select')
      }
      return
    }

    if (toolMode === 'link') {
      if (item.link) {
        const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
        ipc.invoke('shell:openURL', { url: item.link })
      }
      return
    }

    if (toolMode === 'tag') {
      setSelection([item.id])
      useUIStore.getState().openPanel('tagSearch')
      return
    }

    if (toolMode !== 'select') return
    if (e.shiftKey) {
      useCanvasStore.getState().addToSelection(item.id)
    } else {
      setSelection([item.id])
    }
  }

  useEffect(() => {
    if (!mountRef.current) return
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
        }, undefined, (err) => { console.error('GLTFLoader error', err); setLoadError('3D relic failed') })
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
        }, undefined, (err) => { console.error('OBJLoader error', err); setLoadError('3D relic failed') })
      }
    }

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      rendererRef.current = null
      cameraRef.current = null
      if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  }, [item.src])

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
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        <MediaPlaceholder item={item} label={loadError} />
      </DOMItem>
    </>
  )
}
