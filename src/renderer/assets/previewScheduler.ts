export type PreviewGenerator<T = string> = (src: string) => Promise<T>

export type PreviewScheduler<T = string> = {
  request: (src: string) => Promise<T>
}

export function createPreviewScheduler<T = string>({
  concurrency,
  generate,
}: {
  concurrency: number
  generate: PreviewGenerator<T>
}): PreviewScheduler<T> {
  const maxConcurrent = Math.max(1, concurrency)
  const inFlight = new Map<string, Promise<T>>()
  const queue: Array<() => void> = []
  let active = 0

  const acquire = (): Promise<void> => {
    if (active < maxConcurrent) {
      active += 1
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      queue.push(() => {
        active += 1
        resolve()
      })
    })
  }

  const release = (): void => {
    active -= 1
    queue.shift()?.()
  }

  return {
    request(src: string): Promise<T> {
      const existing = inFlight.get(src)
      if (existing) return existing
      const task = (async () => {
        await acquire()
        try {
          return await generate(src)
        } finally {
          release()
        }
      })().finally(() => { inFlight.delete(src) })
      inFlight.set(src, task)
      return task
    },
  }
}
