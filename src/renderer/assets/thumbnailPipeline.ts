import { pathToUrl } from '../utils/pathToUrl'
import { getAssetMetadata, isLocalAssetSrc, recordAssetMetadata } from './assetMetadata'
import { thumbnailDimensions } from './previewPolicy'

type IpcApi = { invoke: (channel: string, args?: unknown) => Promise<unknown> }
const getIpc = (): IpcApi => (window as unknown as { ipc: IpcApi }).ipc

type ThumbnailLookup = { exists: boolean; size?: number; mtimeMs?: number; thumbnailPath?: string | null }

export type ThumbnailGenerator = (src: string) => Promise<string>

const inFlight = new Map<string, Promise<void>>()

// Small queue so a far-zoom sweep over a fresh chamber does not decode
// hundreds of full images at once.
const MAX_CONCURRENT_GENERATIONS = 2
let activeGenerations = 0
const generationQueue: (() => void)[] = []

function acquireGenerationSlot(): Promise<void> {
  if (activeGenerations < MAX_CONCURRENT_GENERATIONS) {
    activeGenerations += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    generationQueue.push(() => {
      activeGenerations += 1
      resolve()
    })
  })
}

function releaseGenerationSlot(): void {
  activeGenerations -= 1
  generationQueue.shift()?.()
}

export async function generateImageThumbnail(src: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image for thumbnail: ${src}`))
    img.src = pathToUrl(src)
  })
  const { width, height } = thumbnailDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

type GiflerFn = (src: string) => {
  frames(canvas: HTMLCanvasElement, fn: (ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => void): void
  stop(): void
}

const getGifler = (): GiflerFn | undefined => (window as unknown as { gifler?: GiflerFn }).gifler

export async function generateGifFirstFrameThumbnail(src: string): Promise<string> {
  const gifler = getGifler()
  if (!gifler) throw new Error('gifler unavailable')

  const canvas = document.createElement('canvas')
  const anim = gifler(pathToUrl(src))

  return new Promise((resolve, reject) => {
    let settled = false
    const fail = window.setTimeout(() => {
      if (settled) return
      settled = true
      anim.stop?.()
      reject(new Error(`Timed out loading GIF preview: ${src}`))
    }, 5000)

    anim.frames(canvas, (ctx, frame) => {
      if (settled) return
      settled = true
      window.clearTimeout(fail)
      canvas.width = frame.buffer.width
      canvas.height = frame.buffer.height
      ctx.drawImage(frame.buffer, 0, 0)
      anim.stop?.()
      resolve(canvas.toDataURL('image/png'))
    })
  })
}

export async function generateVideoPosterThumbnail(src: string): Promise<string> {
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'metadata'
  video.crossOrigin = 'anonymous'

  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(fail)
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) throw new Error('Video frame unavailable')
        const canvas = document.createElement('canvas')
        const { width, height } = thumbnailDimensions(video.videoWidth, video.videoHeight)
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D context unavailable')
        ctx.drawImage(video, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }
    const fail = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`Timed out loading video preview: ${src}`))
    }, 7000)

    video.addEventListener('error', () => {
      if (settled) return
      settled = true
      window.clearTimeout(fail)
      cleanup()
      reject(new Error(`Failed to load video preview: ${src}`))
    }, { once: true })
    video.addEventListener('loadeddata', finish, { once: true })
    video.src = pathToUrl(src)
    video.load()
  })
}

export async function generateModel3DPreviewThumbnail(src: string): Promise<string> {
  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
  const width = 256
  const height = 256
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070808)
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(0, 1, 3)
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(width, height, false)

  scene.add(new THREE.AmbientLight(0xffffff, 0.65))
  const light = new THREE.DirectionalLight(0xffffff, 0.85)
  light.position.set(2, 4, 3)
  scene.add(light)

  const url = pathToUrl(src)
  const ext = src.split('.').pop()?.toLowerCase()
  const loadModel = (): Promise<THREE.Object3D> => new Promise((resolve, reject) => {
    if (ext === 'glb' || ext === 'gltf') {
      new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject)
      return
    }
    if (ext === 'obj') {
      new OBJLoader().load(url, resolve, undefined, reject)
      return
    }
    reject(new Error(`Unsupported 3D preview format: ${src}`))
  })

  try {
    const model = await loadModel()
    const box = new THREE.Box3().setFromObject(model)
    const centre = box.getCenter(new THREE.Vector3())
    const size = Math.max(0.1, box.getSize(new THREE.Vector3()).length())
    model.position.sub(centre)
    camera.position.set(0, 0, size * 1.35)
    camera.near = size * 0.01
    camera.far = size * 100
    camera.updateProjectionMatrix()
    scene.add(model)
    renderer.render(scene, camera)
    return renderer.domElement.toDataURL('image/png')
  } finally {
    renderer.dispose()
  }
}

export function ensureThumbnail(src: string | undefined, generate: ThumbnailGenerator = generateImageThumbnail): Promise<void> {
  if (!isLocalAssetSrc(src)) return Promise.resolve()
  const existing = getAssetMetadata(src)
  if (existing && existing.thumbnailPath !== undefined) return Promise.resolve()
  const pending = inFlight.get(src)
  if (pending) return pending

  const task = (async () => {
    const lookup = await getIpc().invoke('assets:getThumbnail', { path: src }) as ThumbnailLookup
    if (!lookup.exists) {
      recordAssetMetadata({ src, exists: false, thumbnailPath: null })
      return
    }
    if (lookup.thumbnailPath) {
      recordAssetMetadata({ src, exists: true, size: lookup.size, mtimeMs: lookup.mtimeMs, thumbnailPath: lookup.thumbnailPath })
      return
    }
    await acquireGenerationSlot()
    try {
      const imageData = await generate(src)
      const cached = await getIpc().invoke('assets:cacheThumbnail', { path: src, imageData }) as { thumbnailPath?: unknown }
      recordAssetMetadata({
        src,
        exists: true,
        size: lookup.size,
        mtimeMs: lookup.mtimeMs,
        thumbnailPath: typeof cached.thumbnailPath === 'string' ? cached.thumbnailPath : null,
      })
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      recordAssetMetadata({ src, exists: true, size: lookup.size, mtimeMs: lookup.mtimeMs, thumbnailPath: null })
    } finally {
      releaseGenerationSlot()
    }
  })().finally(() => { inFlight.delete(src) })

  inFlight.set(src, task)
  return task
}
