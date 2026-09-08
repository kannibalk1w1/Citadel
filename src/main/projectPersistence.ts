/**
 * `.citadel` project persistence — the buyer-critical save/load path.
 *
 * Kept free of `electron` imports so the round trip can be exercised directly
 * in tests against a real temporary directory. `ipc.ts` is the only caller in
 * the app; the renderer reaches this code exclusively through the IPC bridge.
 */
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path'
import { visitProjectAssetPaths } from '../types/projectAssetPaths'

export type PortableItem = { src?: string; [key: string]: unknown }
export type PortableBoard = { items?: PortableItem[]; [key: string]: unknown }
export type PortableProject = { boards?: PortableBoard[]; [key: string]: unknown }

const URL_SRC_RE = /^(https?|data:|blob:|local:|file:)/i

export function isUrlLikeSrc(src: string): boolean {
  return URL_SRC_RE.test(src)
}

/** Project JSON always stores forward slashes so archives stay portable across platforms. */
export function toJsonPath(path: string): string {
  return path.replace(/\\/g, '/')
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export function uniqueAssetPath(
  assetsDir: string,
  used: Set<string>,
  sourcePath: string,
  checkExisting = true,
): { filename: string; path: string } {
  const parsedExt = extname(sourcePath)
  const rawName = basename(sourcePath, parsedExt).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'asset'
  const ext = parsedExt || '.bin'
  let filename = `${rawName}${ext}`
  let index = 2
  while (used.has(filename.toLowerCase()) || (checkExisting && assetsDir !== '' && existsSync(join(assetsDir, filename)))) {
    filename = `${rawName}-${index}${ext}`
    index += 1
  }
  used.add(filename.toLowerCase())
  return { filename, path: join(assetsDir, filename) }
}

export function walkProjectItems(project: PortableProject, visit: (item: PortableItem) => void): void {
  project.boards?.forEach((board) => board.items?.forEach(visit))
}

/** Compare existing copies without allocating two entire video/audio files. */
function sameFileBytes(source: string, destination: string, size: number): boolean {
  const sourceFd = openSync(source, 'r')
  let destinationFd: number | undefined
  try {
    destinationFd = openSync(destination, 'r')
    const a = Buffer.allocUnsafe(64 * 1024)
    const b = Buffer.allocUnsafe(a.length)
    for (let position = 0; position < size;) {
      const length = Math.min(a.length, size - position)
      const readA = readSync(sourceFd, a, 0, length, position)
      const readB = readSync(destinationFd, b, 0, length, position)
      if (readA !== length || readB !== length || !a.subarray(0, length).equals(b.subarray(0, length))) return false
      position += length
    }
    return true
  } finally {
    if (destinationFd !== undefined) closeSync(destinationFd)
    closeSync(sourceFd)
  }
}

/**
 * Rewrites relic sources to paths relative to the project file, copying in any
 * relic that lives outside the project folder. Never inlines base64.
 */
export function makeCitadelProjectPortable(data: string, projectPath: string): string {
  const project = JSON.parse(data) as PortableProject
  const projectDir = dirname(projectPath)
  const assetsDir = join(projectDir, 'assets')
  const used = new Set<string>()
  const copiedPaths = new Map<string, string>()

  visitProjectAssetPaths(project, (src, replace) => {
    if (isUrlLikeSrc(src)) return

    const sourcePath = isAbsolute(src) ? src : resolve(projectDir, src)
    if (!existsSync(sourcePath)) return
    const copied = copiedPaths.get(sourcePath)
    if (copied) { replace(copied); return }

    if (isInside(projectDir, sourcePath)) {
      replace(toJsonPath(relative(projectDir, sourcePath)))
      return
    }

    if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })
    // Reuse an unchanged copy on subsequent saves, but never replace another
    // project's same-named asset. Only compare bytes when a candidate exists.
    let asset = uniqueAssetPath(assetsDir, used, sourcePath, false)
    const sourceSize = statSync(sourcePath).size
    while (existsSync(asset.path)) {
      const existing = statSync(asset.path)
      if (existing.isFile() && existing.size === sourceSize) {
        if (sameFileBytes(sourcePath, asset.path, sourceSize)) break
      }
      asset = uniqueAssetPath(assetsDir, used, sourcePath, false)
    }
    if (!existsSync(asset.path)) copyFileSync(sourcePath, asset.path)
    const portablePath = toJsonPath(relative(projectDir, asset.path))
    copiedPaths.set(sourcePath, portablePath)
    replace(portablePath)
  })

  return JSON.stringify(project, null, 2)
}

/** Inverse of {@link makeCitadelProjectPortable}: relative relic paths become absolute for the renderer. */
export function resolveCitadelProjectAssets(data: string, projectPath: string): string {
  const project = JSON.parse(data) as PortableProject
  const projectDir = dirname(projectPath)

  visitProjectAssetPaths(project, (src, replace) => {
    if (isUrlLikeSrc(src) || isAbsolute(src)) return
    replace(resolve(projectDir, src))
  })

  return JSON.stringify(project, null, 2)
}

export function isCitadelProjectPath(path: string): boolean {
  return path.toLowerCase().endsWith('.citadel')
}

export function isCitadelArchivePath(path: string): boolean {
  return path.toLowerCase().endsWith('.citadelz')
}

/** Writes a `.citadel` file, making relic paths portable first. Backs `file:save`. */
export function writeCitadelProject(path: string, data: string): void {
  const portableData = isCitadelProjectPath(path) ? makeCitadelProjectPortable(data, path) : data
  writeFileSync(path, portableData, 'utf-8')
}

/** Reads a `.citadel` file, resolving relic paths back to absolute. Backs `file:load`. */
export function readCitadelProject(path: string): string {
  const raw = readFileSync(path, 'utf-8')
  return isCitadelProjectPath(path) ? resolveCitadelProjectAssets(raw, path) : raw
}
