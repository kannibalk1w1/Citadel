// AudioItem: waveform visualization + playback controls as a DOM item.
import React, { useEffect, useRef } from 'react'
import { Rect } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { DOMItem } from './DOMItem'
import { pathToUrl } from '../../utils/pathToUrl'
import { MediaPlaceholder } from './MediaPlaceholder'
import { adoptSelectTool, handleRelicToolPress } from './relicPointer'

type Props = { item: CanvasItem; domOnly?: boolean }

export function AudioItem({ item, domOnly = false }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const toolMode = useUIStore((s) => s.toolMode)
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const waveformDataRef = useRef<Uint8Array | null>(null)
  const animRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const prepareCanvas = (): { ctx: CanvasRenderingContext2D; width: number; height: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const width = Math.max(1, Math.round(canvas.clientWidth || canvas.width || 200))
    const height = Math.max(1, Math.round(canvas.clientHeight || canvas.height || 60))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      // Assigning width/height resets the 2D context state. Fetch it again so
      // callers always draw through the context belonging to this bitmap.
      canvasContextRef.current = null
    }
    const ctx = canvasContextRef.current ?? canvas.getContext('2d')
    if (!ctx) return null
    canvasContextRef.current = ctx
    return { ctx, width, height }
  }

  // Draw the waveform onto the canvas element
  const drawWaveform = () => {
    const analyser = analyserRef.current
    if (!analyser) return
    const prepared = prepareCanvas()
    if (!prepared) return
    const { ctx, width: w, height: h } = prepared

    const bufLen = analyser.frequencyBinCount
    const data = waveformDataRef.current?.length === bufLen
      ? waveformDataRef.current
      : new Uint8Array(bufLen)
    waveformDataRef.current = data
    analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>)

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#10100f'
    ctx.fillRect(0, 0, w, h)

    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#505050'
    ctx.beginPath()
    const sliceW = w / bufLen
    let x = 0
    for (let i = 0; i < bufLen; i++) {
      const v = data[i] / 128.0
      const y = (v * h) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceW
    }
    ctx.lineTo(w, h / 2)
    ctx.stroke()

    animRef.current = requestAnimationFrame(drawWaveform)
  }

  // Draw a static flat line when paused
  const drawIdle = () => {
    const prepared = prepareCanvas()
    if (!prepared) return
    const { ctx, width: w, height: h } = prepared
    ctx.fillStyle = '#10100f'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#2a2722'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
  }

  const setupAudioContext = () => {
    const audio = audioRef.current
    if (!audio || ctxRef.current) return
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const source = audioCtx.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    ctxRef.current = audioCtx
    analyserRef.current = analyser
    sourceRef.current = source
  }

  useEffect(() => {
    const audio = audioRef.current
    drawIdle()
    return () => {
      cancelAnimationFrame(animRef.current)
      audio?.pause()
      sourceRef.current?.disconnect()
      analyserRef.current?.disconnect()
      sourceRef.current = null
      analyserRef.current = null
      const audioContext = ctxRef.current
      ctxRef.current = null
      waveformDataRef.current = null
      canvasContextRef.current = null
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => {})
      }
    }
  }, [item.src])

  const handlePlay = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    // A play event queued during unmount/source replacement must not recreate
    // the graph or restart the RAF loop after the old element is gone.
    if (event.currentTarget !== audioRef.current) return
    setupAudioContext()
    cancelAnimationFrame(animRef.current)
    drawWaveform()
  }

  const handlePause = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget !== audioRef.current) return
    cancelAnimationFrame(animRef.current)
    drawIdle()
  }

  return (
    <>
      {!domOnly && (
        <Rect
          x={item.x} y={item.y}
          width={item.width} height={item.height}
          rotation={item.rotation}
          fill="#10100f"
          stroke="#2a2722"
          strokeWidth={1}
          onClick={(e) => { e.cancelBubble = true; setSelection([item.id]) }}
        />
      )}
      <DOMItem
        item={item}
        editableFrame
        style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', padding: 4 }}
        onClick={(e) => {
          e.stopPropagation()
          if (handleRelicToolPress(toolMode, activeBoardId, item)) return
          adoptSelectTool(toolMode)
          setSelection([item.id])
        }}
      >
        {item.src ? (
          <>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 'calc(100% - 40px)', display: 'block' }}
            />
            <audio
              key={item.src}
              ref={audioRef}
              src={pathToUrl(item.src)}
              controls
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handlePause}
              style={{ width: '100%', height: 32, display: 'block' }}
            />
          </>
        ) : <MediaPlaceholder item={item} />}
      </DOMItem>
    </>
  )
}
