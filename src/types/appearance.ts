/**
 * The `styles:*` and `fonts:*` wire contract.
 *
 * Citadel's themes are CSS variables, so a person who wants a different look
 * does not need a plugin API: they need their own stylesheet loaded after ours,
 * and their own font files available to it. That is what Obsidian does, and it
 * is why an Obsidian vault can be made to look like anything.
 *
 * Both live in the user's data folder, not in a project. A `.citadel` file is
 * made to be handed around, and a project that could carry CSS or a font into
 * someone else's app would be a project that could restyle it silently.
 */

/** The folder names under userData. Named here because both sides say them. */
export const USER_STYLE_DIRS = {
  snippets: 'snippets',
  fonts: 'fonts',
} as const

export const APPEARANCE_LIMITS = {
  /** A stylesheet is text. Anything this size is not a stylesheet. */
  maxSnippetBytes: 512 * 1024,
  /** Comfortably larger than a full-weight variable font. */
  maxFontBytes: 16 * 1024 * 1024,
  /** Enough to style an app, few enough to list without a scrollbar of its own. */
  maxSnippets: 50,
  maxFonts: 50,
} as const

export const STYLE_EXTENSIONS = ['css'] as const
/** What the browser can actually load through FontFace. */
export const FONT_EXTENSIONS = ['woff2', 'woff', 'ttf', 'otf'] as const

/**
 * Which faces a person can reassign. These are the three the whole interface is
 * built from, so between them they cover every glyph Citadel draws, Konva
 * included by way of `canvasColors.ts`.
 */
export const FONT_ROLES = ['display', 'body', 'mono'] as const
export type FontRole = typeof FONT_ROLES[number]

export const FONT_ROLE_TOKENS: Record<FontRole, string> = {
  display: '--font-display',
  body: '--font-body',
  mono: '--font-mono',
}

export const FONT_ROLE_LABELS: Record<FontRole, string> = {
  display: 'Headings',
  body: 'Interface',
  mono: 'Monospace',
}

/** What ships, and what a role falls back to when a chosen font goes missing. */
export const BUILT_IN_FONT_STACKS: Record<FontRole, string> = {
  display: "'Inter', 'DM Sans', sans-serif",
  body: "'Inter', 'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
}

export type FontChoices = Partial<Record<FontRole, string>>

export type UserSnippet = {
  /** The filename without its extension. This is the id and the label. */
  name: string
  enabled: boolean
  /** The stylesheet itself. Snippets are small, so listing reads them. */
  css: string
  bytes: number
}

export type UserFont = {
  /** The filename without its extension, used as the CSS family name. */
  family: string
  file: string
  bytes: number
}

export type UserSnippetsResult = {
  /** Absolute path, so Settings can offer to open the folder it means. */
  folder: string
  snippets: UserSnippet[]
  /** Set when the folder holds more than the cap, so the panel can say so. */
  truncated?: boolean
}

export type UserFontsResult = {
  folder: string
  fonts: UserFont[]
  /** The person's current assignments, so one call fills the whole panel. */
  choices: FontChoices
  truncated?: boolean
}

export const APPEARANCE_SETTINGS_KEYS = {
  /** Snippet names the person switched on, in the order they are applied. */
  enabledSnippets: 'appearance.enabledSnippets',
  /** Role to CSS font-family value. A bare family name is legal here. */
  fontChoices: 'appearance.fontChoices',
} as const

/**
 * A family name is dropped into a CSS declaration, so it is quoted and stripped
 * of anything that could end the declaration and start another. Without this a
 * font named `x; position: fixed` would be a style injection through a filename.
 */
export function cssFontFamilyValue(family: string): string {
  const cleaned = family.replace(/["';{}()<>]/g, '').trim()
  return cleaned ? `'${cleaned}'` : ''
}

/** The family a role should use: the person's choice, then what ships. */
export function fontStackFor(role: FontRole, choices: FontChoices): string {
  const chosen = choices[role]?.trim()
  if (!chosen) return BUILT_IN_FONT_STACKS[role]
  const quoted = cssFontFamilyValue(chosen)
  return quoted ? `${quoted}, ${BUILT_IN_FONT_STACKS[role]}` : BUILT_IN_FONT_STACKS[role]
}

/** Only the roles Citadel knows, only strings. Settings files are edited by hand. */
export function normalizeFontChoices(value: unknown): FontChoices {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  return FONT_ROLES.reduce<FontChoices>((choices, role) => {
    const chosen = raw[role]
    if (typeof chosen === 'string' && chosen.trim() !== '') choices[role] = chosen.trim()
    return choices
  }, {})
}

/** Snippet names, deduplicated, order preserved: it is the order they apply in. */
export function normalizeEnabledSnippets(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.filter((name): name is string => (
    typeof name === 'string' && name.trim() !== '' && !seen.has(name) && (seen.add(name), true)
  ))
}
