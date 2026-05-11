import { ipcMain, dialog, shell, app } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import JSZip from 'jszip'
import { mkdirSync, existsSync, copyFileSync } from 'fs'

// Settings store (simple JSON file in userData)
const settingsPath = join(app.getPath('userData'), 'settings.json')
function readSettings(): Record<string, unknown> {
  try { return JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch { return {} }
}
function writeSettings(data: Record<string, unknown>): void {
  writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}

export function registerIpcHandlers(): void {

  // ── file:save ──────────────────────────────────────────────────────────────
  ipcMain.handle('file:save', async (_e, { path, data }: { path: string; data: string }) => {
    writeFileSync(path, data, 'utf-8')
    return { ok: true }
  })

  // ── file:load ──────────────────────────────────────────────────────────────
  ipcMain.handle('file:load', async (_e, { path }: { path: string }) => {
    const data = readFileSync(path, 'utf-8')
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
  ipcMain.handle('export:zip', async (_e, { projectJson, assetPaths, filename }: { projectJson: string; assetPaths: string[]; filename: string }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Citadel Archive', extensions: ['citadelz'] }],
    })
    if (canceled || !filePath) return { ok: false }

    const zip = new JSZip()
    zip.file('project.citadel', projectJson)
    const assets = zip.folder('assets')!
    for (const assetPath of assetPaths) {
      try {
        const buf = readFileSync(assetPath)
        assets.file(assetPath.split(/[/\\]/).pop()!, buf)
      } catch { /* skip missing */ }
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    writeFileSync(filePath, buf)
    return { ok: true, path: filePath }
  })

  // ── import:zip ─────────────────────────────────────────────────────────────
  ipcMain.handle('import:zip', async (_e, { zipPath }: { zipPath: string }) => {
    const buf = readFileSync(zipPath)
    const zip = await JSZip.loadAsync(buf)
    const projectJson = await zip.file('project.citadel')!.async('string')

    const assetDir = join(dirname(zipPath), '_citadel_assets')
    if (!existsSync(assetDir)) mkdirSync(assetDir, { recursive: true })

    const assets = zip.folder('assets')
    if (assets) {
      const writes: Promise<void>[] = []
      assets.forEach((relativePath, file) => {
        writes.push(
          file.async('nodebuffer').then((buf) => {
            writeFileSync(join(assetDir, relativePath), buf)
          })
        )
      })
      await Promise.all(writes)
    }

    return { projectJson, assetDir }
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
