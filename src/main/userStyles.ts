import { promises as fsp } from 'fs'
import { basename, extname, join } from 'path'
import {
  APPEARANCE_LIMITS,
  FONT_EXTENSIONS,
  STYLE_EXTENSIONS,
  USER_STYLE_DIRS,
} from '../types/appearance'
import type { FontChoices, UserFont, UserFontsResult, UserSnippet, UserSnippetsResult } from '../types/appearance'

/**
 * A person's own stylesheets and fonts, main process only.
 *
 * Both folders live under userData and are created on first read, so the
 * Settings pane can always offer to open somewhere that exists. Only files
 * directly inside them are considered: no recursion, no following a name out of
 * the folder, and nothing read that is larger than the thing it claims to be.
 */

const isKnownExtension = (file: string, allowed: readonly string[]): boolean => (
  allowed.includes(extname(file).slice(1).toLowerCase())
)

/** The label for a file, which is also its id. Any path in a name is dropped. */
export function displayName(file: string): string {
  return basename(file, extname(file))
}

export async function ensureDir(dir: string): Promise<void> {
  await fsp.mkdir(dir, { recursive: true }).catch(() => {})
}

export const snippetsDirFor = (userDataDir: string): string => join(userDataDir, USER_STYLE_DIRS.snippets)
export const fontsDirFor = (userDataDir: string): string => join(userDataDir, USER_STYLE_DIRS.fonts)

/**
 * `readdir` hands back names, never paths, so joining one onto the folder
 * cannot escape it. This still refuses anything with a separator in it, because
 * a name that looks like a path is not a file this feature should be reading.
 */
function isPlainName(name: string): boolean {
  return name !== '' && !name.includes('/') && !name.includes('\\') && !name.startsWith('.')
}

async function listFiles(dir: string, allowed: readonly string[]): Promise<string[]> {
  let entries: string[]
  try {
    entries = await fsp.readdir(dir)
  } catch {
    return []
  }
  return entries.filter((name) => isPlainName(name) && isKnownExtension(name, allowed)).sort()
}

/**
 * Every stylesheet in the folder, read. They are enabled in the order the
 * person's settings list them, so a later snippet can undo an earlier one, and
 * a name that is no longer on disk simply does not appear.
 */
export async function listSnippets(dir: string, enabled: string[]): Promise<UserSnippetsResult> {
  await ensureDir(dir)
  const files = await listFiles(dir, STYLE_EXTENSIONS)
  const kept = files.slice(0, APPEARANCE_LIMITS.maxSnippets)

  const snippets = await Promise.all(kept.map(async (file): Promise<UserSnippet | null> => {
    const path = join(dir, file)
    try {
      const stat = await fsp.stat(path)
      if (!stat.isFile()) return null
      // Read only what a stylesheet could plausibly be: the cap is checked
      // before the read, not after, so a huge file is never held in memory.
      if (stat.size > APPEARANCE_LIMITS.maxSnippetBytes) return null
      return {
        name: displayName(file),
        enabled: enabled.includes(displayName(file)),
        css: await fsp.readFile(path, 'utf-8'),
        bytes: stat.size,
      }
    } catch {
      return null
    }
  }))

  return {
    folder: dir,
    snippets: snippets.filter((snippet): snippet is UserSnippet => snippet !== null),
    truncated: files.length > kept.length || undefined,
  }
}

/** Font files are listed, not read: the renderer asks for bytes when it needs them. */
export async function listFonts(dir: string, choices: FontChoices = {}): Promise<UserFontsResult> {
  await ensureDir(dir)
  const files = await listFiles(dir, FONT_EXTENSIONS)
  const kept = files.slice(0, APPEARANCE_LIMITS.maxFonts)

  const fonts = await Promise.all(kept.map(async (file): Promise<UserFont | null> => {
    try {
      const stat = await fsp.stat(join(dir, file))
      if (!stat.isFile() || stat.size > APPEARANCE_LIMITS.maxFontBytes) return null
      return { family: displayName(file), file, bytes: stat.size }
    } catch {
      return null
    }
  }))

  return {
    folder: dir,
    fonts: fonts.filter((font): font is UserFont => font !== null),
    choices,
    truncated: files.length > kept.length || undefined,
  }
}

export type FontBytes = { ok: true; family: string; data: ArrayBuffer } | { ok: false; reason: string }

/**
 * One font file, as bytes for `FontFace`. Bytes rather than a URL on purpose:
 * the renderer's policy allows no font host, and passing the file through the
 * bridge keeps it that way instead of opening the policy to reach a local one.
 */
export async function readFont(dir: string, file: unknown): Promise<FontBytes> {
  if (typeof file !== 'string' || !isPlainName(file) || !isKnownExtension(file, FONT_EXTENSIONS)) {
    return { ok: false, reason: 'That is not a font file Citadel can load.' }
  }

  const path = join(dir, file)
  try {
    const stat = await fsp.stat(path)
    if (!stat.isFile()) return { ok: false, reason: 'That font could not be found.' }
    if (stat.size > APPEARANCE_LIMITS.maxFontBytes) {
      return { ok: false, reason: 'That font file is too large to load.' }
    }
    const buffer = await fsp.readFile(path)
    // A copy, not a view onto Node's pooled allocator: the whole pool would
    // otherwise travel across the bridge with it.
    const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
    return { ok: true, family: displayName(file), data }
  } catch {
    return { ok: false, reason: 'That font could not be read.' }
  }
}
