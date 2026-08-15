/**
 * `.citadel` project persistence — the buyer-critical save/load path.
 *
 * Kept free of `electron` imports so the round trip can be exercised directly
 * in tests against a real temporary directory. `ipc.ts` is the only caller in
 * the app; the renderer reaches this code exclusively through the IPC bridge.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path'

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

/**
 * Rewrites relic sources to paths relative to the project file, copying in any
 * relic that lives outside the project folder. Never inlines base64.
 */
export function makeCitadelProjectPortable(data: string, projectPath: string): string {
  const project = JSON.parse(data) as PortableProject
  const projectDir = dirname(projectPath)
  const assetsDir = join(projectDir, 'assets')
  const used = new Set<string>()

  walkProjectItems(project, (item) => {
    const src = item.src
    if (!src || isUrlLikeSrc(src)) return

    const sourcePath = isAbsolute(src) ? src : resolve(projectDir, src)
    if (!existsSync(sourcePath)) return

    if (isInside(projectDir, sourcePath)) {
      item.src = toJsonPath(relative(projectDir, sourcePath))
      return
    }

    if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })
    const asset = uniqueAssetPath(assetsDir, used, sourcePath, false)
    copyFileSync(sourcePath, asset.path)
    item.src = toJsonPath(relative(projectDir, asset.path))
  })

  return JSON.stringify(project, null, 2)
}

/** Inverse of {@link makeCitadelProjectPortable}: relative relic paths become absolute for the renderer. */
export function resolveCitadelProjectAssets(data: string, projectPath: string): string {
  const project = JSON.parse(data) as PortableProject
  const projectDir = dirname(projectPath)

  walkProjectItems(project, (item) => {
    const src = item.src
    if (!src || isUrlLikeSrc(src) || isAbsolute(src)) return
    item.src = resolve(projectDir, src)
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
