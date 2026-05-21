import { app } from 'electron'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const recoveryPath = join(app.getPath('userData'), 'recovery.citadel')

export function initCrashRecovery(): void {
  app.on('before-quit', () => {
    clearRecoveryData()
  })
}

export function getRecoveryData(): string | null {
  if (!existsSync(recoveryPath)) return null
  return readFileSync(recoveryPath, 'utf-8')
}

export function clearRecoveryData(): void {
  if (existsSync(recoveryPath)) unlinkSync(recoveryPath)
}
