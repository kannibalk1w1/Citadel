import type { ThreadMeaning } from '../../../types'

export const threadMeanings = [
  'reference',
  'memory',
  'source',
  'echo',
  'contradiction',
  'question',
  'proof',
  'inspiration',
  'warning',
  'sequence',
] as const satisfies readonly ThreadMeaning[]

export const threadMeaningOptions: { value: ThreadMeaning; label: string }[] = threadMeanings.map((value) => ({
  value,
  label: value.split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' '),
}))

const threadMeaningSet = new Set<string>(threadMeanings)

export function normalizeThreadMeaning(value: unknown): ThreadMeaning | undefined {
  return typeof value === 'string' && threadMeaningSet.has(value) ? value as ThreadMeaning : undefined
}

export function threadMeaningLabel(meaning: ThreadMeaning): string {
  return threadMeaningOptions.find((option) => option.value === meaning)?.label ?? meaning
}
