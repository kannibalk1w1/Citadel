export const CODE_LANGUAGES = [
  'plaintext', 'typescript', 'javascript', 'python', 'json', 'html', 'css', 'bash', 'sql', 'yaml',
] as const

export type CodeLanguage = typeof CODE_LANGUAGES[number]

export function normalizeCodeLanguage(value: unknown): CodeLanguage {
  return typeof value === 'string' && (CODE_LANGUAGES as readonly string[]).includes(value)
    ? value as CodeLanguage
    : 'plaintext'
}
