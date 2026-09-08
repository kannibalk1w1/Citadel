import { afterAll, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { localByteRange, serveLocalAsset } from './localAssets'

const directory = await mkdtemp(join(tmpdir(), 'citadel-local-range-'))
const path = join(directory, 'audio.wav')
await writeFile(path, new Uint8Array(100))
afterAll(() => rm(directory, { recursive: true, force: true }))

describe('local media byte ranges', () => {
  it.each([
    ['bytes=10-19', { start: 10, end: 19 }], ['bytes=50-', { start: 50, end: 99 }],
    ['bytes=-10', { start: 90, end: 99 }], ['bytes=10-500', { start: 10, end: 99 }],
    ['bytes=100-', null], ['bytes=20-10', null], ['bytes=-0', null], ['bytes=0-1,3-4', null],
    ['bytes=9007199254740993-', null], ['bytes=-', null],
  ])('validates %s', (header, result) => expect(localByteRange(header, 100)).toEqual(result))

  it('forwards the byte range and declares a seekable partial response', async () => {
    const fetchFile = vi.fn().mockResolvedValue(new Response(new Uint8Array(10), { headers: { 'Content-Type': 'audio/wav' } }))
    const response = await serveLocalAsset(new Request(`local:///${path}`, { headers: { Range: 'bytes=10-19' } }), fetchFile)
    expect(fetchFile).toHaveBeenCalledWith(expect.stringContaining('audio.wav'), expect.objectContaining({ headers: { Range: 'bytes=10-19' } }))
    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 10-19/100')
    expect(response.headers.get('content-length')).toBe('10')
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect((await response.arrayBuffer()).byteLength).toBe(10)
  })

  it('declares full response length and refuses unsatisfiable ranges before fetching', async () => {
    const fetchFile = vi.fn().mockResolvedValue(new Response(new Uint8Array(100)))
    const response = await serveLocalAsset(new Request(`local:///${path}`), fetchFile)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-length')).toBe('100')
    const invalid = await serveLocalAsset(new Request(`local:///${path}`, { headers: { Range: 'bytes=200-' } }), fetchFile)
    expect(invalid.status).toBe(416)
    expect(fetchFile).toHaveBeenCalledTimes(1)
  })
})
