export const CODE_LANGUAGES = [
  'plaintext', 'typescript', 'javascript', 'python', 'json', 'html', 'css', 'bash', 'sql', 'yaml',
] as const

export type CodeLanguage = typeof CODE_LANGUAGES[number]

export function normalizeCodeLanguage(value: unknown): CodeLanguage {
  return typeof value === 'string' && (CODE_LANGUAGES as readonly string[]).includes(value)
    ? value as CodeLanguage
    : 'plaintext'
}

// The line-number gutter has to hold the widest number in the snippet. At the
// card's 12px mono a digit is about 7.2px wide, plus the 10px right padding;
// without this a 100+ line snippet pushed its numbers into the code.
export function gutterWidth(lineCount: number): number {
  return Math.max(28, String(Math.max(1, lineCount)).length * 8 + 12)
}

/**
 * The card's layout in CSS pixels at 100%. Image and PDF export repaint the
 * card with the 2D context rather than capturing the DOM, so these live here
 * instead of inline in the component — two copies of 32 and 1.55 would drift
 * and the export would stop looking like the card it represents.
 */
export const CODE_CARD_LAYOUT = {
  headerHeight: 32,
  fontPx: 12,
  lineHeight: 1.55,
  padX: 12,
  padY: 10,
  gutterGap: 10,
} as const

export type TokenKind = 'plain' | 'keyword' | 'string' | 'number' | 'comment'
export type Token = { text: string; kind: TokenKind }

const KEYWORDS = new Set([
  'async', 'await', 'break', 'catch', 'class', 'const', 'continue', 'def', 'else', 'export',
  'false', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'let', 'new', 'null',
  'return', 'switch', 'throw', 'true', 'try', 'type', 'undefined', 'while', 'with', 'yield',
])

/** Shared by the on-canvas card and the export painter so colours agree. */
export function tokensForLine(line: string): Token[] {
  const tokens: Token[] = []
  const parts = line.split(/(\/\/.*|#.*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`(?:\\.|[^`])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g)
  for (const part of parts) {
    if (!part) continue
    const kind: TokenKind = /^\/\/|^#|^\/\*/.test(part) ? 'comment'
      : /^['"`]/.test(part) ? 'string'
        : /^\d/.test(part) ? 'number'
          : KEYWORDS.has(part) ? 'keyword' : 'plain'
    tokens.push({ text: part, kind })
  }
  return tokens
}
