import { describe, expect, it } from 'vitest'
import { parseDataUrl } from './dataUrl'

const body = Buffer.from('citadel').toString('base64')

describe('parseDataUrl', () => {
  it('accepts a plain data URL', () => {
    const parsed = parseDataUrl(`data:image/png;base64,${body}`)

    expect(parsed?.type).toBe('image')
    expect(parsed?.extension).toBe('png')
    expect(parsed?.bytes.toString()).toBe('citadel')
  })

  /**
   * The bug this module exists for. MediaRecorder reports audio/webm;codecs=opus,
   * so every voice memo arrived with a parameter the old parser rejected —
   * the recording worked and saving it threw.
   */
  it('accepts the media-type parameters a recorder actually produces', () => {
    expect(parseDataUrl(`data:audio/webm;codecs=opus;base64,${body}`)?.extension).toBe('webm')
    expect(parseDataUrl(`data:audio/ogg;codecs=opus;base64,${body}`)?.extension).toBe('ogg')
    expect(parseDataUrl(`data:video/webm;codecs=vp8,opus;base64,${body}`)?.extension).toBe('webm')
    expect(parseDataUrl(`data:text/plain;charset=utf-8;base64,${body}`)?.type).toBe('text')
  })

  it('gives a usable extension where the subtype is a poor one', () => {
    expect(parseDataUrl(`data:image/jpeg;base64,${body}`)?.extension).toBe('jpg')
    expect(parseDataUrl(`data:image/svg+xml;base64,${body}`)?.extension).toBe('svg')
    expect(parseDataUrl(`data:audio/mpeg;base64,${body}`)?.extension).toBe('mp3')
    expect(parseDataUrl(`data:image/vnd.microsoft.icon;base64,${body}`)?.extension).toBe('ico')
  })

  it('tolerates whitespace inside the payload, which is legal', () => {
    const split = `${body.slice(0, 4)}\n  ${body.slice(4)}`

    expect(parseDataUrl(`data:image/png;base64,${split}`)?.bytes.toString()).toBe('citadel')
  })

  it('rejects anything that is not a base64 data URL', () => {
    expect(parseDataUrl('https://example.com/a.png')).toBeNull()
    expect(parseDataUrl('data:image/png,notbase64')).toBeNull()
    expect(parseDataUrl('data:image/png;base64,')).toBeNull()
    expect(parseDataUrl('data:;base64,AAAA')).toBeNull()
    expect(parseDataUrl('')).toBeNull()
    expect(parseDataUrl(undefined)).toBeNull()
    expect(parseDataUrl(42)).toBeNull()
  })

  it('rejects a payload that decodes to nothing', () => {
    expect(parseDataUrl('data:image/png;base64,   ')).toBeNull()
  })
})
