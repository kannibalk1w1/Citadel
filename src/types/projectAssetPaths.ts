/** File-bearing fields only. Never interpret document text or links as files. */
const META_ASSETS = ['sourcePdf', 'transcriptOf'] as const

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function visitProjectAssetPaths(
  project: unknown,
  visit: (source: string, replace: (path: string) => void) => void,
): void {
  const item = (value: unknown): void => {
    if (!record(value)) return
    if (typeof value.src === 'string' && value.src) visit(value.src, (path) => { value.src = path })
    const meta = value.meta
    if (!record(meta)) return
    for (const key of META_ASSETS) {
      const source = meta[key]
      if (typeof source === 'string' && source) visit(source, (path) => { meta[key] = path })
    }
  }
  const payload = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(item)
    else if (record(value) && Array.isArray(value.items)) value.items.forEach(item)
    else item(value)
  }
  if (!record(project)) return
  if (Array.isArray(project.boards)) {
    for (const board of project.boards) {
      if (record(board) && Array.isArray(board.items)) board.items.forEach(item)
    }
  }
  // Recordings may refer to a deleted item or an earlier PDF page. Those
  // sources are part of the saved project too, not disposable preview state.
  if (Array.isArray(project.recordings)) {
    for (const recording of project.recordings) {
      if (!record(recording) || !Array.isArray(recording.events)) continue
      for (const event of recording.events) {
        if (!record(event)) continue
        payload(event.before)
        payload(event.after)
      }
    }
  }
}

export function projectAssetPaths(project: unknown): string[] {
  const paths = new Set<string>()
  visitProjectAssetPaths(project, (source) => paths.add(source))
  return [...paths]
}
