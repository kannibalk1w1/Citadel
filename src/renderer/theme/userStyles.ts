import {
  FONT_ROLES,
  FONT_ROLE_TOKENS,
  fontStackFor,
} from '../../types/appearance'
import type { FontChoices, UserFontsResult, UserSnippetsResult } from '../../types/appearance'
import { refreshCanvasColors } from './canvasColors'

/**
 * A person's own stylesheets and fonts, applied to the running app.
 *
 * Citadel's whole look is CSS variables, so customisation does not need a
 * plugin API: a stylesheet loaded after the theme can move any token, and the
 * three type roles can be pointed at any font in the fonts folder. This is the
 * Obsidian bargain, and it is why a vault can be made to look like anything.
 *
 * The snippet element is appended last and kept last, so a person's CSS wins
 * over the theme's on equal specificity without needing `!important`
 * everywhere. Fonts are registered from bytes through `FontFace`, which is why
 * the renderer's policy still needs no font host.
 */

const SNIPPET_ELEMENT_ID = 'citadel-user-snippets'

type Ipc = { invoke: (channel: string, args?: unknown) => Promise<unknown> }
const getIpc = (): Ipc | null => (window as unknown as { ipc?: Ipc }).ipc ?? null

/** Families already handed to the document, so a refresh does not re-read them. */
const registeredFamilies = new Set<string>()

/**
 * Wrapped in `@layer`-free plain CSS with a comment naming each snippet, so
 * anyone reading the inspector can see which file a rule came from.
 */
export function composeSnippetCss(result: UserSnippetsResult, enabledOrder: string[]): string {
  const byName = new Map(result.snippets.map((snippet) => [snippet.name, snippet]))
  return enabledOrder
    .map((name) => byName.get(name))
    .filter((snippet): snippet is NonNullable<typeof snippet> => Boolean(snippet))
    .map((snippet) => `/* ${snippet.name}.css */\n${snippet.css}`)
    .join('\n\n')
}

/** The order enabled snippets apply in: what the list says, then the rest. */
export function enabledOrderFrom(result: UserSnippetsResult): string[] {
  return result.snippets.filter((snippet) => snippet.enabled).map((snippet) => snippet.name)
}

function snippetElement(): HTMLStyleElement {
  const existing = document.getElementById(SNIPPET_ELEMENT_ID)
  if (existing instanceof HTMLStyleElement) return existing
  const element = document.createElement('style')
  element.id = SNIPPET_ELEMENT_ID
  return element
}

export function applySnippetCss(css: string): void {
  const element = snippetElement()
  element.textContent = css
  // Re-appended every time: anything the app adds to head later would otherwise
  // start winning over the person's own stylesheet.
  document.head.appendChild(element)
}

export async function refreshUserSnippets(): Promise<UserSnippetsResult | null> {
  const ipc = getIpc()
  if (!ipc) return null
  const result = await ipc.invoke('styles:list') as UserSnippetsResult | undefined
  if (!result || !Array.isArray(result.snippets)) return null

  applySnippetCss(composeSnippetCss(result, enabledOrderFrom(result)))
  // Konva paints from resolved copies, so a snippet that moves a token has to
  // reach the canvas too or half the app changes colour and half does not.
  refreshCanvasColors()
  return result
}

/** Assigns the three type roles. A family with no font behind it falls back. */
export function applyFontChoices(choices: FontChoices): void {
  for (const role of FONT_ROLES) {
    document.documentElement.style.setProperty(FONT_ROLE_TOKENS[role], fontStackFor(role, choices))
  }
  refreshCanvasColors()
}

async function registerFont(ipc: Ipc, file: string): Promise<void> {
  const result = await ipc.invoke('fonts:read', { file }) as
    { ok: true; family: string; data: ArrayBuffer } | { ok: false } | undefined
  if (!result?.ok || registeredFamilies.has(result.family)) return

  try {
    const face = new FontFace(result.family, result.data)
    await face.load()
    document.fonts.add(face)
    registeredFamilies.add(result.family)
  } catch {
    // A font file the platform will not parse is not worth a message: the role
    // that wanted it falls back to what ships, which is a visible answer.
  }
}

export async function refreshUserFonts(): Promise<UserFontsResult | null> {
  const ipc = getIpc()
  if (!ipc) return null
  const result = await ipc.invoke('fonts:list') as UserFontsResult | undefined
  if (!result || !Array.isArray(result.fonts)) return null

  // Every font in the folder is registered, not only the chosen ones, so the
  // panel can show a person their own faces in their own faces.
  await Promise.all(result.fonts.map((font) => registerFont(ipc, font.file)))
  applyFontChoices(result.choices ?? {})
  return result
}

/** Called once at startup, and again whenever Settings changes something. */
export async function refreshUserAppearance(): Promise<void> {
  await Promise.all([
    refreshUserSnippets().catch(() => null),
    refreshUserFonts().catch(() => null),
  ])
}

/** Test seam: the registry is module state, and a test needs it empty. */
export function clearRegisteredFontsForTest(): void {
  registeredFamilies.clear()
}
