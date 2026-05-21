import { ipcMain, dialog, shell, app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path'
import JSZip from 'jszip'

// Settings store (simple JSON file in userData)
const settingsPath = join(app.getPath('userData'), 'settings.json')
const pdfCacheDir = (): string => join(app.getPath('userData'), 'pdf-cache')
function readSettings(): Record<string, unknown> {
  try { return JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch { return {} }
}
function writeSettings(data: Record<string, unknown>): void {
  writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}

function getPdfCacheStats(): { count: number; bytes: number } {
  const cacheDir = pdfCacheDir()
  if (!existsSync(cacheDir)) return { count: 0, bytes: 0 }

  return readdirSync(cacheDir).reduce((acc, filename) => {
    const path = join(cacheDir, filename)
    try {
      const stat = statSync(path)
      if (stat.isFile()) {
        acc.count += 1
        acc.bytes += stat.size
      }
    } catch { /* skip unreadable cache entries */ }
    return acc
  }, { count: 0, bytes: 0 })
}

function clearUnusedPdfPreviews(preservePaths: string[]): { deleted: number; bytes: number } {
  const cacheDir = pdfCacheDir()
  if (!existsSync(cacheDir)) return { deleted: 0, bytes: 0 }
  const preserved = new Set(preservePaths.map((path) => path.toLowerCase()))

  return readdirSync(cacheDir).reduce((acc, filename) => {
    const path = join(cacheDir, filename)
    try {
      const stat = statSync(path)
      if (!stat.isFile() || preserved.has(path.toLowerCase())) return acc
      unlinkSync(path)
      acc.deleted += 1
      acc.bytes += stat.size
    } catch { /* skip locked or unreadable cache entries */ }
    return acc
  }, { deleted: 0, bytes: 0 })
}

function scanFilesByBasename(root: string): { byName: Map<string, string>; scanned: number } {
  const byName = new Map<string, string>()
  let scanned = 0
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      try {
        const stat = statSync(path)
        if (stat.isDirectory()) {
          visit(path)
        } else if (stat.isFile()) {
          scanned += 1
          const key = basename(path).toLowerCase()
          if (!byName.has(key)) byName.set(key, path)
        }
      } catch { /* skip unreadable files */ }
    }
  }
  visit(root)
  return { byName, scanned }
}

type PortableItem = { src?: string; [key: string]: unknown }
type PortableBoard = { items?: PortableItem[]; [key: string]: unknown }
type PortableProject = { boards?: PortableBoard[]; [key: string]: unknown }
type ZipAsset = { sourcePath: string; zipPath: string }

const URL_SRC_RE = /^(https?|data:|blob:|local:|file:)/i

function isUrlLikeSrc(src: string): boolean {
  return URL_SRC_RE.test(src)
}

function toJsonPath(path: string): string {
  return path.replace(/\\/g, '/')
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function uniqueAssetPath(assetsDir: string, used: Set<string>, sourcePath: string, checkExisting = true): { filename: string; path: string } {
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

function walkProjectItems(project: PortableProject, visit: (item: PortableItem) => void): void {
  project.boards?.forEach((board) => board.items?.forEach(visit))
}

function makeCitadelProjectPortable(data: string, projectPath: string): string {
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

function resolveCitadelProjectAssets(data: string, projectPath: string): string {
  const project = JSON.parse(data) as PortableProject
  const projectDir = dirname(projectPath)

  walkProjectItems(project, (item) => {
    const src = item.src
    if (!src || isUrlLikeSrc(src) || isAbsolute(src)) return
    item.src = resolve(projectDir, src)
  })

  return JSON.stringify(project, null, 2)
}

function prepareZipProject(projectJson: string, assetPaths: string[]): { projectJson: string; assets: ZipAsset[] } {
  const project = JSON.parse(projectJson) as PortableProject
  const knownAssets = new Set(assetPaths)
  const used = new Set<string>()
  const assets: ZipAsset[] = []

  walkProjectItems(project, (item) => {
    const src = item.src
    if (!src || isUrlLikeSrc(src)) return
    const sourcePath = isAbsolute(src) ? src : resolve(src)
    if (!knownAssets.has(src) && !knownAssets.has(sourcePath)) return
    if (!existsSync(sourcePath)) return

    const asset = uniqueAssetPath('', used, sourcePath)
    const zipPath = toJsonPath(join('assets', asset.filename))
    assets.push({ sourcePath, zipPath })
    item.src = zipPath
  })

  return { projectJson: JSON.stringify(project, null, 2), assets }
}

async function writeZipProject(filePath: string, projectJson: string, assetPaths: string[]): Promise<void> {
  const prepared = prepareZipProject(projectJson, assetPaths)
  const zip = new JSZip()
  zip.file('project.citadel', prepared.projectJson)
  for (const asset of prepared.assets) {
    try {
      zip.file(asset.zipPath, readFileSync(asset.sourcePath))
    } catch { /* skip missing */ }
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync(filePath, buf)
}

function collectProjectAssetPaths(projectJson: string): string[] {
  const project = JSON.parse(projectJson) as PortableProject
  const paths: string[] = []
  walkProjectItems(project, (item) => {
    const src = item.src
    if (src && !isUrlLikeSrc(src)) paths.push(src)
  })
  return paths
}

function resolveImportedZipProject(projectJson: string, assetDir: string): string {
  const project = JSON.parse(projectJson) as PortableProject

  walkProjectItems(project, (item) => {
    const src = item.src
    if (!src || isUrlLikeSrc(src) || isAbsolute(src)) return
    item.src = resolve(assetDir, src.replace(/^assets[\\/]/i, ''))
  })

  return JSON.stringify(project, null, 2)
}

function writeDataUrlAsset(imageData: string, filename: string): { path: string } {
  const match = imageData.match(/^data:image\/([a-z0-9+.-]+);base64,(.+)$/i)
  if (!match) throw new Error('Unsupported image data')
  const ext = match[1].toLowerCase().replace('jpeg', 'jpg')
  const assetDir = join(app.getPath('userData'), 'captured-assets')
  if (!existsSync(assetDir)) mkdirSync(assetDir, { recursive: true })
  const safeBase = filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'capture'
  const used = new Set(readdirSync(assetDir).map((entry) => entry.toLowerCase()))
  const asset = uniqueAssetPath(assetDir, used, `${safeBase}.${ext}`)
  writeFileSync(asset.path, Buffer.from(match[2], 'base64'))
  return { path: asset.path }
}

export function registerIpcHandlers(): void {

  // ── file:save ──────────────────────────────────────────────────────────────
  ipcMain.handle('file:save', async (_e, { path, data }: { path: string; data: string }) => {
    if (path.toLowerCase().endsWith('.citadelz')) {
      await writeZipProject(path, data, collectProjectAssetPaths(data))
      return { ok: true }
    }

    const portableData = path.toLowerCase().endsWith('.citadel')
      ? makeCitadelProjectPortable(data, path)
      : data
    writeFileSync(path, portableData, 'utf-8')
    return { ok: true }
  })

  // ── file:load ──────────────────────────────────────────────────────────────
  ipcMain.handle('file:load', async (_e, { path }: { path: string }) => {
    const raw = readFileSync(path, 'utf-8')
    const data = path.toLowerCase().endsWith('.citadel')
      ? resolveCitadelProjectAssets(raw, path)
      : raw
    return { data }
  })

  // ── file:saveDialog ────────────────────────────────────────────────────────
  ipcMain.handle('file:saveDialog', async (_e, { defaultName = 'untitled.citadel' } = {}) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'Citadel Project', extensions: ['citadel'] },
        { name: 'Citadel Archive', extensions: ['citadelz'] },
      ],
    })
    return { path: canceled ? null : filePath }
  })

  // ── file:openDialog ────────────────────────────────────────────────────────
  ipcMain.handle('file:openDialog', async (_e, { filters }: { filters?: Electron.FileFilter[] } = {}) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: filters ?? [
        { name: 'Citadel Files', extensions: ['citadel', 'citadelz'] },
      ],
      properties: ['openFile'],
    })
    return { path: canceled ? null : filePaths[0] }
  })

  // ── file:saveRecovery ──────────────────────────────────────────────────────
  ipcMain.handle('file:saveRecovery', async (_e, { data }: { data: string }) => {
    const recoveryPath = join(app.getPath('userData'), 'recovery.citadel')
    writeFileSync(recoveryPath, data, 'utf-8')
    return { ok: true }
  })

  // ── export:pdf ─────────────────────────────────────────────────────────────
  ipcMain.handle('export:pdf', async (_e, { imageData, filename }: { imageData: string; filename: string }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { ok: false }
    const base64 = imageData.replace(/^data:application\/pdf;base64,/, '')
    writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return { ok: true, path: filePath }
  })

  // ── export:image ───────────────────────────────────────────────────────────
  ipcMain.handle('export:image', async (_e, { imageData, filename, format }: { imageData: string; filename: string; format: string; quality: number }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    })
    if (canceled || !filePath) return { ok: false }
    const base64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return { ok: true, path: filePath }
  })

  // ── export:zip ─────────────────────────────────────────────────────────────
  ipcMain.handle('pdf:cachePageImage', async (_e, { pdfPath, page, imageData }: { pdfPath: string; page: number; imageData: string }) => {
    const cacheDir = pdfCacheDir()
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
    const safeBase = pdfPath
      .split(/[/\\]/)
      .pop()
      ?.replace(/\.pdf$/i, '')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'document'
    const filename = `${safeBase}-page-${page}-${Date.now()}.png`
    const outPath = join(cacheDir, filename)
    const base64 = imageData.replace(/^data:image\/png;base64,/, '')
    writeFileSync(outPath, Buffer.from(base64, 'base64'))
    return { path: outPath }
  })

  ipcMain.handle('cache:pdfStats', async () => getPdfCacheStats())

  ipcMain.handle('cache:clearUnusedPdfPreviews', async (_e, { preservePaths }: { preservePaths: string[] }) => {
    const result = clearUnusedPdfPreviews(Array.isArray(preservePaths) ? preservePaths : [])
    return { ...result, stats: getPdfCacheStats() }
  })

  ipcMain.handle('assets:checkPaths', async (_e, { paths }: { paths: string[] }) => {
    const uniquePaths = Array.from(new Set(Array.isArray(paths) ? paths : []))
    const missing = uniquePaths.filter((path) => !existsSync(path))
    return { total: uniquePaths.length, missing: missing.length, missingPaths: missing }
  })

  ipcMain.handle('assets:relinkMissing', async (_e, { missingPaths }: { missingPaths: string[] }) => {
    const missing = Array.from(new Set(Array.isArray(missingPaths) ? missingPaths : []))
    if (missing.length === 0) return { replacements: {}, scanned: 0 }
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Choose folder to search for missing assets',
      properties: ['openDirectory'],
    })
    if (canceled || !filePaths[0]) return { replacements: {}, scanned: 0 }

    const { byName, scanned } = scanFilesByBasename(filePaths[0])
    const replacements = missing.reduce<Record<string, string>>((acc, missingPath) => {
      const match = byName.get(basename(missingPath).toLowerCase())
      if (match) acc[missingPath] = match
      return acc
    }, {})
    return { replacements, scanned }
  })

  ipcMain.handle('assets:saveDataUrl', async (_e, { imageData, filename }: { imageData: string; filename: string }) => (
    writeDataUrlAsset(imageData, filename)
  ))

  ipcMain.handle('export:zip', async (_e, { projectJson, assetPaths, filename }: { projectJson: string; assetPaths: string[]; filename: string }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Citadel Archive', extensions: ['citadelz'] }],
    })
    if (canceled || !filePath) return { ok: false }

    await writeZipProject(filePath, projectJson, assetPaths)
    return { ok: true, path: filePath }
  })

  // ── import:zip ─────────────────────────────────────────────────────────────
  ipcMain.handle('import:zip', async (_e, { zipPath }: { zipPath: string }) => {
    const buf = readFileSync(zipPath)
    const zip = await JSZip.loadAsync(buf)
    const rawProjectJson = await zip.file('project.citadel')!.async('string')

    const assetDir = join(dirname(zipPath), '_citadel_assets')
    if (!existsSync(assetDir)) mkdirSync(assetDir, { recursive: true })

    const assets = zip.folder('assets')
    if (assets) {
      const writes: Promise<void>[] = []
      assets.forEach((relativePath, file) => {
        const outPath = join(assetDir, relativePath)
        writes.push(
          file.async('nodebuffer').then((buf) => {
            mkdirSync(dirname(outPath), { recursive: true })
            writeFileSync(outPath, buf)
          })
        )
      })
      await Promise.all(writes)
    }

    return { projectJson: resolveImportedZipProject(rawProjectJson, assetDir), assetDir }
  })

  // ── shell:openURL ──────────────────────────────────────────────────────────
  ipcMain.handle('shell:openURL', async (_e, { url }: { url: string }) => {
    await shell.openExternal(url)
    return { ok: true }
  })

  // ── settings:get ──────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', async (_e, { key }: { key: string }) => {
    const settings = readSettings()
    return { value: settings[key] ?? null }
  })

  // ── settings:set ──────────────────────────────────────────────────────────
  ipcMain.handle('settings:set', async (_e, { key, value }: { key: string; value: unknown }) => {
    const settings = readSettings()
    settings[key] = value
    writeSettings(settings)
    return { ok: true }
  })

  // ── zoom:set ───────────────────────────────────────────────────────────────
  ipcMain.handle('zoom:set', async (e, { factor }: { factor: number }) => {
    if (!Number.isFinite(factor)) return { ok: false }
    const clamped = Math.min(1.5, Math.max(0.75, factor))
    e.sender.setZoomFactor(clamped)
    const settings = readSettings()
    settings['ui.zoomFactor'] = clamped
    writeSettings(settings)
    return { ok: true }
  })

  // ── recovery:get ──────────────────────────────────────────────────────────
  ipcMain.handle('recovery:get', async () => {
    const recoveryPath = join(app.getPath('userData'), 'recovery.citadel')
    try {
      const { existsSync, readFileSync } = await import('fs')
      if (!existsSync(recoveryPath)) return { data: null }
      return { data: readFileSync(recoveryPath, 'utf-8') }
    } catch { return { data: null } }
  })

  // ── recovery:clear ────────────────────────────────────────────────────────
  ipcMain.handle('recovery:clear', async () => {
    const recoveryPath = join(app.getPath('userData'), 'recovery.citadel')
    try {
      const { existsSync, unlinkSync } = await import('fs')
      if (existsSync(recoveryPath)) unlinkSync(recoveryPath)
    } catch { /* ignore */ }
    return { ok: true }
  })
}
