import { app } from 'electron'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const recoveryPath = join(app.getPath('userData'), 'recovery.citadel')

export function initCrashRecovery(): void {
  // Handled in renderer — main just exposes the path
  app.on('before-quit', () => {
    // Recovery file is written by renderer via file:saveRecovery IPC.
    // On clean exit the renderer sends a cleanup signal.
  })
}

export function getRecoveryData(): string | null {
  if (!existsSync(recoveryPath)) return null
  return readFileSync(recoveryPath, 'utf-8')
}

export function clearRecoveryData(): void {
  if (existsSync(recoveryPath)) unlinkSync(recoveryPath)
}
