import { describe, expect, it, vi } from 'vitest'
import { createPreviewScheduler } from './previewScheduler'

describe('previewScheduler', () => {
  it('limits concurrent preview generation and preserves results', async () => {
    let active = 0
    let peak = 0
    const release: Array<() => void> = []
    const generator = vi.fn(async (src: string) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise<void>((resolve) => release.push(resolve))
      active -= 1
      return `preview:${src}`
    })
    const scheduler = createPreviewScheduler({ concurrency: 2, generate: generator })

    const jobs = ['a', 'b', 'c'].map((src) => scheduler.request(src))
    await Promise.resolve()

    expect(generator).toHaveBeenCalledTimes(2)
    release.shift()?.()
    await jobs[0]
    expect(generator).toHaveBeenCalledTimes(3)
    release.splice(0).forEach((resolve) => resolve())

    await expect(Promise.all(jobs)).resolves.toEqual(['preview:a', 'preview:b', 'preview:c'])
    expect(peak).toBe(2)
  })

  it('dedupes in-flight preview requests by source', async () => {
    const generator = vi.fn(async (src: string) => `preview:${src}`)
    const scheduler = createPreviewScheduler({ concurrency: 1, generate: generator })

    await expect(Promise.all([scheduler.request('a'), scheduler.request('a')])).resolves.toEqual(['preview:a', 'preview:a'])

    expect(generator).toHaveBeenCalledTimes(1)
  })
})
