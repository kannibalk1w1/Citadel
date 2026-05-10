/*
 * HyperType Integration
 *
 * Adapted from HyperType by Thanh-huy1104
 * https://github.com/Thanh-Huy1104/hypertype
 *
 * MIT License — Copyright (c) 2025 Thanh-huy1104
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

import typeSoundUrl from '../assets/sounds/ht-type.mp3'
import enterSoundUrl from '../assets/sounds/ht-enter.mp3'
import sliceSoundUrl from '../assets/sounds/ht-slice.mp3'

// Shared mouse position — read by CanvasStage for burst positioning
export const lastMouse = { x: 0, y: 0 }

const SPECIAL_LABELS: Record<string, string> = {
  Enter: 'ENTER', Backspace: 'BKSP', Tab: 'TAB', ' ': 'SPC',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Delete: 'DEL', Escape: 'ESC',
}

class HyperTypeEngine {
  private _enabled = false
  private _overlay: HTMLDivElement | null = null
  private _container: HTMLDivElement | null = null

  private _ctx: AudioContext | null = null
  private _typeBuffer: AudioBuffer | null = null
  private _enterBuffer: AudioBuffer | null = null
  private _sliceBuffer: AudioBuffer | null = null
  private _audioLoaded = false

  private _pitchLevel = 0
  private _pitchTimer: ReturnType<typeof setTimeout> | null = null

  setOverlay(el: HTMLDivElement): void { this._overlay = el }
  setCanvasContainer(el: HTMLDivElement): void { this._container = el }

  setEnabled(v: boolean): void {
    this._enabled = v
    if (v && !this._audioLoaded) this._loadAudio().catch(console.error)
  }

  private async _loadAudio(): Promise<void> {
    this._ctx = new AudioContext()
    const load = async (url: string): Promise<AudioBuffer> => {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      return this._ctx!.decodeAudioData(buf)
    }
    const [t, e, s] = await Promise.all([
      load(typeSoundUrl),
      load(enterSoundUrl),
      load(sliceSoundUrl),
    ])
    this._typeBuffer = t
    this._enterBuffer = e
    this._sliceBuffer = s
    this._audioLoaded = true
  }

  private _play(buffer: AudioBuffer | null, pitch: number): void {
    if (!this._ctx || !buffer) return
    const src = this._ctx.createBufferSource()
    src.buffer = buffer
    src.detune.value = 1200 * Math.log2(pitch)
    const gain = this._ctx.createGain()
    gain.gain.value = 0.5
    src.connect(gain)
    gain.connect(this._ctx.destination)
    src.start(0)
  }

  private _escalatePitch(): number {
    this._pitchLevel++
    if (this._pitchTimer) clearTimeout(this._pitchTimer)
    this._pitchTimer = setTimeout(() => { this._pitchLevel = 0 }, 300)
    return Math.min(1.3, Math.max(0.95, 1.0 + this._pitchLevel * 0.01))
  }

  private _spawnLabel(label: string, x: number, y: number): void {
    if (!this._overlay) return
    const span = document.createElement('span')
    span.textContent = label
    const hue = (Date.now() / 20) % 360
    span.style.cssText = [
      `position:absolute`,
      `left:${x}px`,
      `top:${y - 10}px`,
      `font-family:'Press Start 2P',monospace`,
      `font-size:13px`,
      `color:hsl(${hue},90%,65%)`,
      `pointer-events:none`,
      `white-space:nowrap`,
      `animation:htFloat 600ms ease-out forwards`,
    ].join(';')
    span.addEventListener('animationend', () => span.remove(), { once: true })
    this._overlay.appendChild(span)
  }

  private _shake(cls: 'ht-shake-light' | 'ht-shake-medium', ms: number): void {
    const el = this._container
    if (!el) return
    el.classList.remove('ht-shake-light', 'ht-shake-medium')
    void el.offsetWidth
    el.classList.add(cls)
    setTimeout(() => el.classList.remove(cls), ms)
  }

  keyStroke(key: string, screenX: number, screenY: number): void {
    if (!this._enabled) return
    const pitch = this._escalatePitch()
    const isEnter = key === 'Enter'
    this._play(isEnter ? this._enterBuffer : this._typeBuffer, pitch)
    const label = SPECIAL_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key.slice(0, 3).toUpperCase())
    this._spawnLabel(label, screenX, screenY)
    this._shake('ht-shake-light', 80)
  }

  burst(icon: string, screenX: number, screenY: number, soundType: 'normal' | 'enter' | 'slice' = 'normal'): void {
    if (!this._enabled) return
    const pitch = this._escalatePitch()
    const buffer = soundType === 'slice' ? this._sliceBuffer
      : soundType === 'enter' ? this._enterBuffer
      : this._typeBuffer
    this._play(buffer, pitch)
    this._spawnLabel(icon, screenX, screenY)
    this._shake('ht-shake-medium', 120)
  }
}

export const engine = new HyperTypeEngine()
