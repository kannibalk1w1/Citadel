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
