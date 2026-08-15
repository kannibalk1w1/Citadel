import { ipcMain, dialog, shell, app, clipboard, nativeImage } from 'electron'
import { copyFileSync, existsSync, mkdirSync, promises as fsp, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'path'
import JSZip from 'jszip'
import { createProgressThrottle, extractCitadelZip, inspectCitadelZip } from './archiveZip'
import type { PortableProject } from './projectPersistence'
import {
  isCitadelArchivePath,
  isUrlLikeSrc,
  readCitadelProject,
  toJsonPath,
  uniqueAssetPath,
  walkProjectItems,
  writeCitadelProject,
} from './projectPersistence'
import { clearUnusedPreviews, getPreviewCacheStats, statSource, thumbnailFilename, writePreviewPng } from './previewCache'
import { getManySettings, readSettingsFile, setManySettings, writeSettingsFile } from './settingsStore'

// Settings store (simple JSON file in userData)
const settingsPath = join(app.getPath('userData'), 'settings.json')
const pdfCacheDir = (): string => join(app.getPath('userData'), 'pdf-cache')
const previewCacheDir = (): string => join(app.getPath('userData'), 'preview-cache')
// New previews are written to preview-cache; legacy pdf-cache is read and cleaned only.
const previewCacheDirs = (): string[] => [previewCacheDir(), pdfCacheDir()]
function readSettings(): Record<string, unknown> {
  return readSettingsFile(settingsPath)
}
function writeSettings(data: Record<string, unknown>): void {
  writeSettingsFile(settingsPath, data)
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

type ZipAsset = { sourcePath: string; zipPath: string }

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

async function writeZipProject(
  filePath: string,
  projectJson: string,
  assetPaths: string[],
  onPercent?: (percent: number) => void,
): Promise<void> {
  const prepared = prepareZipProject(projectJson, assetPaths)
  const zip = new JSZip()
  zip.file('project.citadel', prepared.projectJson)
  for (const asset of prepared.assets) {
    try {
      zip.file(asset.zipPath, readFileSync(asset.sourcePath))
    } catch { /* skip missing */ }
  }
  const buf = await zip.generateAsync(
    { type: 'nodebuffer', compression: 'DEFLATE' },
    (meta) => onPercent?.(meta.percent),
  )
  await fsp.writeFile(filePath, buf)
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

function writeDataUrlAsset(dataUrl: string, filename: string): { path: string } {
  const match = dataUrl.match(/^data:([a-z0-9+.-]+)\/([a-z0-9+.-]+);base64,(.+)$/i)
  if (!match) throw new Error('Unsupported asset data')
  const ext = match[2].toLowerCase().replace('jpeg', 'jpg')
  const assetDir = join(app.getPath('userData'), 'captured-assets')
  if (!existsSync(assetDir)) mkdirSync(assetDir, { recursive: true })
  const safeBase = filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'capture'
  const used = new Set(readdirSync(assetDir).map((entry) => entry.toLowerCase()))
  const asset = uniqueAssetPath(assetDir, used, `${safeBase}.${ext}`)
  writeFileSync(asset.path, Buffer.from(match[3], 'base64'))
  return { path: asset.path }
}

export function registerIpcHandlers(): void {

  // ── file:save ──────────────────────────────────────────────────────────────
  ipcMain.handle('file:save', async (_e, { path, data }: { path: string; data: string }) => {
    if (isCitadelArchivePath(path)) {
      await writeZipProject(path, data, collectProjectAssetPaths(data))
      return { ok: true }
    }

    writeCitadelProject(path, data)
    return { ok: true }
  })

  // ── file:load ──────────────────────────────────────────────────────────────
  ipcMain.handle('file:load', async (_e, { path }: { path: string }) => {
    return { data: readCitadelProject(path) }
  })

  // ── file:saveDialog ────────────────────────────────────────────────────────
  ipcMain.handle('file:saveDialog', async (_e, { defaultName = 'untitled.citadel', filters }: { defaultName?: string; filters?: Electron.FileFilter[] } = {}) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: filters ?? [
        { name: 'Citadel Project', extensions: ['citadel'] },
        { name: 'Citadel Archive', extensions: ['citadelz'] },
      ],
    })
    return { path: canceled ? null : filePath }
  })

  // ── assets:scanFolder ─ pick a folder and list its media files ─────────────
  const MEDIA_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'webp', 'bmp', 'svg', 'gif',
    'mp4', 'webm', 'mov', 'mkv', 'mp3', 'wav', 'ogg', 'flac',
    'glb', 'gltf', 'obj',
  ])
  const SCAN_MAX_FILES = 500
  const SCAN_MAX_DEPTH = 3
  ipcMain.handle('assets:scanFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled || filePaths.length === 0) return { folder: null, files: [] }
    const folder = filePaths[0]
    const files: string[] = []
    const visit = (dir: string, depth: number): void => {
      if (files.length >= SCAN_MAX_FILES || depth > SCAN_MAX_DEPTH) return
      let entries: string[] = []
      try {
        entries = readdirSync(dir)
      } catch {
        return
      }
      for (const entry of entries) {
        if (files.length >= SCAN_MAX_FILES) return
        const path = join(dir, entry)
        try {
          const stat = statSync(path)
          if (stat.isDirectory()) {
            visit(path, depth + 1)
          } else if (stat.isFile()) {
            const extension = extname(entry).slice(1).toLowerCase()
            if (MEDIA_EXTENSIONS.has(extension)) files.push(path)
          }
        } catch { /* skip unreadable entries */ }
      }
    }
    visit(folder, 0)
    return { folder, files }
  })

  // ── assets:exportCopy ─ copy a relic's source file to a user-chosen path ───
  ipcMain.handle('assets:exportCopy', async (_e, { sourcePath, targetPath }: { sourcePath: string; targetPath: string }) => {
    if (!sourcePath || !targetPath || !existsSync(sourcePath)) return { ok: false }
    try {
      copyFileSync(sourcePath, targetPath)
      return { ok: true }
    } catch {
      return { ok: false }
    }
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
    const safeBase = pdfPath
      .split(/[/\\]/)
      .pop()
      ?.replace(/\.pdf$/i, '')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'document'
    const filename = `${safeBase}-page-${page}-${Date.now()}.png`
    return { path: writePreviewPng(previewCacheDir(), filename, imageData) }
  })

  ipcMain.handle('cache:previewStats', async () => getPreviewCacheStats(previewCacheDirs()))

  ipcMain.handle('cache:clearUnusedPreviews', async (_e, { preservePaths, assetPaths }: { preservePaths: string[]; assetPaths: string[] }) => {
    const preserved = (Array.isArray(preservePaths) ? preservePaths : []).slice()
    for (const assetPath of Array.isArray(assetPaths) ? assetPaths : []) {
      const stat = statSource(assetPath)
      if (stat.exists && stat.size !== undefined && stat.mtimeMs !== undefined) {
        preserved.push(join(previewCacheDir(), thumbnailFilename(assetPath, stat.size, stat.mtimeMs)))
      }
    }
    const result = clearUnusedPreviews(previewCacheDirs(), preserved)
    return { ...result, stats: getPreviewCacheStats(previewCacheDirs()) }
  })

  ipcMain.handle('assets:getThumbnail', async (_e, { path }: { path: string }) => {
    const stat = statSource(path)
    if (!stat.exists || stat.size === undefined || stat.mtimeMs === undefined) {
      return { exists: false, thumbnailPath: null }
    }
    const thumbnailPath = join(previewCacheDir(), thumbnailFilename(path, stat.size, stat.mtimeMs))
    return {
      exists: true,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      thumbnailPath: existsSync(thumbnailPath) ? thumbnailPath : null,
    }
  })

  ipcMain.handle('assets:cacheThumbnail', async (_e, { path, imageData }: { path: string; imageData: string }) => {
    const stat = statSource(path)
    if (!stat.exists || stat.size === undefined || stat.mtimeMs === undefined) {
      throw new Error('Cannot cache thumbnail for missing source file')
    }
    return { thumbnailPath: writePreviewPng(previewCacheDir(), thumbnailFilename(path, stat.size, stat.mtimeMs), imageData) }
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

  ipcMain.handle('assets:saveDataUrl', async (_e, { dataUrl, imageData, filename }: { dataUrl?: string; imageData?: string; filename: string }) => (
    writeDataUrlAsset(dataUrl ?? imageData ?? '', filename)
  ))

  ipcMain.handle('clipboard:writeImageDataUrl', async (_e, { imageData }: { imageData: string }) => {
    const base64 = imageData.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '')
    const image = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'))
    if (image.isEmpty()) return { ok: false }
    clipboard.writeImage(image)
    return { ok: true }
  })

  ipcMain.handle('export:zip', async (e, { projectJson, assetPaths, filename }: { projectJson: string; assetPaths: string[]; filename: string }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Citadel Archive', extensions: ['citadelz'] }],
    })
    if (canceled || !filePath) return { ok: false }

    try {
      const sendProgress = createProgressThrottle((percent) => {
        e.sender.send('archive:progress', { op: 'export', percent })
      })
      await writeZipProject(filePath, projectJson, assetPaths, sendProgress)
      sendProgress(100)
      return { ok: true, path: filePath }
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) }
    }
  })

  // ── import:zip ─────────────────────────────────────────────────────────────
  ipcMain.handle('import:zip', async (e, { zipPath }: { zipPath: string }) => {
    try {
      const buf = await fsp.readFile(zipPath)
      const zip = await JSZip.loadAsync(buf)
      const manifest = inspectCitadelZip(zip)
      const rawProjectJson = await manifest.project.async('string')
      if (Buffer.byteLength(rawProjectJson) > 512 * 1024 * 1024) throw new Error('Archive project entry too large')

      const assetDir = join(dirname(zipPath), '_citadel_assets')
      const sendProgress = createProgressThrottle((percent) => {
        e.sender.send('archive:progress', { op: 'import', percent })
      })
      await extractCitadelZip(manifest, assetDir, {
        onProgress: ({ done, total }) => sendProgress(Math.round((done / Math.max(1, total)) * 100)),
      })
      sendProgress(100)

      return { ok: true, projectJson: resolveImportedZipProject(rawProjectJson, assetDir), assetDir }
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) }
    }
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

  ipcMain.handle('settings:getMany', async (_e, { keys }: { keys?: unknown } = {}) => {
    const settings = readSettings()
    return { values: getManySettings(settings, Array.isArray(keys) ? keys : []) }
  })

  // ── settings:set ──────────────────────────────────────────────────────────
  ipcMain.handle('settings:set', async (_e, { key, value }: { key: string; value: unknown }) => {
    const settings = readSettings()
    settings[key] = value
    writeSettings(settings)
    return { ok: true }
  })

  ipcMain.handle('settings:setMany', async (_e, { values }: { values?: unknown } = {}) => {
    const settings = setManySettings(readSettings(), values)
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
