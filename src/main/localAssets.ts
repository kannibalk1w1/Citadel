import { stat } from 'fs/promises'
import { pathToFileURL } from 'url'

/** Single byte range used by Chromium media players; never buffers the asset. */
export function localByteRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (!match[1] && !match[2]) || size <= 0) return null
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  let end = match[1] && match[2] ? Number(match[2]) : size - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start || (!match[1] && Number(match[2]) === 0)) return null
  end = Math.min(end, size - 1)
  return { start, end }
}

/** Electron's file fetch slices Range bodies but omits HTTP range/length headers.
 * Supply them so media can seek instead of being treated as an unknown stream. */
export async function serveLocalAsset(request: Request, fetchFile: (url: string, init?: RequestInit) => Promise<Response>): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
  let path: string
  try { path = decodeURIComponent(request.url.slice('local:///'.length)) }
  catch { return new Response(null, { status: 400 }) }
  let size: number
  try {
    const info = await stat(path)
    if (!info.isFile()) return new Response(null, { status: 404 })
    size = info.size
  } catch { return new Response(null, { status: 404 }) }
  const rawRange = request.headers.get('range')
  const range = rawRange ? localByteRange(rawRange, size) : undefined
  if (rawRange && !range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  const response = await fetchFile(pathToFileURL(path).toString(), {
    signal: request.signal,
    ...(range ? { headers: { Range: `bytes=${range.start}-${range.end}` } } : {}),
  })
  if (!response.ok) return response
  const headers = new Headers(response.headers)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Content-Length', String(range ? range.end - range.start + 1 : size))
  if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
  if (request.method === 'HEAD') await response.body?.cancel()
  return new Response(request.method === 'HEAD' ? null : response.body, { status: range ? 206 : 200, headers })
}
