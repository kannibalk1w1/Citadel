import { readFileSync, writeFileSync } from 'fs'

export function readSettingsFile(settingsPath: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function writeSettingsFile(settingsPath: string, data: Record<string, unknown>): void {
  writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}

export function getManySettings(settings: Record<string, unknown>, keys: unknown[]): Record<string, unknown> {
  return keys.reduce<Record<string, unknown>>((acc, key) => {
    if (typeof key === 'string') acc[key] = settings[key] ?? null
    return acc
  }, {})
}

export function setManySettings(settings: Record<string, unknown>, values: unknown): Record<string, unknown> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return settings
  return Object.entries(values as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, { ...settings })
}
