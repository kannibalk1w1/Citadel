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
  const animRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  // Draw the waveform onto the canvas element
  const drawWaveform = () => {
    const analyser = analyserRef.current
    const cv = canvasRef.current
    if (!analyser || !cv) return

    const ctx = cv.getContext('2d')
    if (!ctx) return

    const bufLen = analyser.frequencyBinCount
    const data = new Uint8Array(bufLen)
    analyser.getByteTimeDomainData(data)

    const w = cv.clientWidth || cv.width
    const h = cv.clientHeight || cv.height
    cv.width = w
    cv.height = h

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
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const w = cv.clientWidth || 200
    const h = cv.clientHeight || 60
    cv.width = w
    cv.height = h
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
    drawIdle()
    return () => cancelAnimationFrame(animRef.current)
  }, [item.src])

  const handlePlay = () => {
    setupAudioContext()
    cancelAnimationFrame(animRef.current)
    drawWaveform()
  }

  const handlePause = () => {
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
