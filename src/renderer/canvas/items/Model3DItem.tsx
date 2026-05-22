// Model3DItem: Three.js scene rendered into a DOM canvas synced to viewport.
import React, { useEffect, useRef } from 'react'
import { Rect } from 'react-konva'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { DOMItem } from './DOMItem'

type Props = { item: CanvasItem }

export function Model3DItem({ item }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const w = mountRef.current.clientWidth || item.width
    const h = mountRef.current.clientHeight || item.height

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x070808)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    camera.position.set(0, 1, 3)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
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
        }, undefined, (err) => console.error('GLTFLoader error', err))
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
        }, undefined, (err) => console.error('OBJLoader error', err))
      }
    }

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      mountRef.current?.removeChild(renderer.domElement)
    }
  }, [item.src, item.width, item.height])

  return (
    <>
      <Rect
        x={item.x} y={item.y}
        width={item.width} height={item.height}
        rotation={item.rotation}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; setSelection([item.id]) }}
      />
      <DOMItem item={item}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      </DOMItem>
    </>
  )
}
