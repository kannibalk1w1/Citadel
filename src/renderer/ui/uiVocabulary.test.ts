import { readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

/**
 * Vocabulary drift is how "New chamber" ended up next to the native menu's
 * "New Board" for the same button and the same shortcut. `docs/citadel-ui-
 * vocabulary.md` settled the words; this guards the ones a user actually reads,
 * so the archival vocabulary can keep living in identifiers without leaking
 * back into the interface.
 *
 * Deliberately narrow. It reads a fixed set of user-facing surfaces rather than
 * every string, because identifiers, store fields, search haystacks and CSS
 * variables are all supposed to keep the old words.
 */

const rendererRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(rendererRoot, '..', '..')

/** Words the interface must not show. Identifiers may still use them. */
const FORBIDDEN = [
  'chamber', 'relic', 'sigil', 'waystone', 'inscription', 'inscribe',
  'rite', 'binding', 'ledger', 'workbench', 'quill', 'arcane', 'rune',
  'gothic', 'mystic', 'ritual', 'eldritch', 'tome', 'codex', 'unseal',
]

/**
 * Intentional archival terms, each a visual style name rather than a control.
 * `citadel-ui-vocabulary.md` keeps these: they name a look the way an
 * application names a layer effect. Add to this list only with a doc change.
 */
const ALLOWED = new Set(['Relic'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return []
    return [full]
  })
}

type Finding = { file: string; line: number; text: string; term: string }

/**
 * Pulls the strings a user reads: element text, the attributes screen readers
 * and tooltips use, the toast/prompt messages, and `label:` entries that feed
 * menus and toolbars.
 */
function userFacingStrings(source: string): { line: number; text: string }[] {
  const found: { line: number; text: string }[] = []
  source.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) return
    const push = (text: string) => {
      // A `${...}` hole is an identifier, not something the user reads. Its
      // value is checked wherever that value is authored, so blank it out
      // rather than reporting `${relic.chamberName}` as visible copy.
      const visible = text.replace(/\$\{[^}]*\}/g, '\u2026').trim()
      if (visible) found.push({ line: index + 1, text: visible })
    }

    for (const m of line.matchAll(/(?:title|aria-label|placeholder|alt)=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g)) {
      push(m[1] ?? m[2] ?? m[3] ?? '')
    }
    for (const m of line.matchAll(/(?:inscribe|askInscription)\(\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g)) {
      push(m[1] ?? m[2] ?? m[3] ?? '')
    }
    for (const m of line.matchAll(/\b(?:label|title|subtitle)[:=]\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g)) {
      push(m[1] ?? m[2] ?? m[3] ?? '')
    }
    // Generated display names — `addBoard(`Chamber ${n}`)`, the fallback name a
    // malformed project file gets — become titles the user reads and renames.
    for (const m of line.matchAll(/[`'"]([A-Z][A-Za-z]+(?: [A-Za-z]+)*) \$\{/g)) push(m[1])

    // JSX text: a whole line of prose, or text sitting between tags. Code that
    // happens to start with a capital (`Array.isArray(x) && ...`) is not prose,
    // so reject call syntax and boolean operators outright.
    const looksLikeCode = /[A-Za-z]\(|&&|\|\||=>|===|\bas\b/.test(line)
    if (!looksLikeCode && /^[A-Z][A-Za-z0-9 ,'’&().\-–—:!?/]{2,90}$/.test(line) && !/[=<>{};]/.test(line)) push(line)
    for (const m of line.matchAll(/>([A-Za-z][A-Za-z0-9 ,'’&().\-–—:!?]{2,80})</g)) push(m[1])
  })
  return found
}

describe('user-facing vocabulary', () => {
  const files = sourceFiles(rendererRoot).concat(join(repoRoot, 'src', 'main', 'menu.ts'))

  it('reads a meaningful amount of interface copy', () => {
    const total = files.reduce((sum, file) => sum + userFacingStrings(readFileSync(file, 'utf-8')).length, 0)
    // Guards the extractor itself: a regex that silently stops matching would
    // make every assertion below pass for the wrong reason.
    expect(total).toBeGreaterThan(200)
  })

  it('shows the user no archival vocabulary', () => {
    const findings: Finding[] = []
    for (const file of files) {
      for (const { line, text } of userFacingStrings(readFileSync(file, 'utf-8'))) {
        if (ALLOWED.has(text)) continue
        const term = FORBIDDEN.find((word) => new RegExp(`\\b${word}`, 'i').test(text))
        if (term) findings.push({ file: relative(repoRoot, file), line, text, term })
      }
    }

    expect(findings.map((f) => `${f.file}:${f.line} [${f.term}] ${f.text}`)).toEqual([])
  })

  it('still recognises the plain words the vocabulary settled on', () => {
    const copy = files.flatMap((file) => userFacingStrings(readFileSync(file, 'utf-8')).map((s) => s.text))
    for (const word of ['Board', 'Tag', 'Connection', 'Index']) {
      expect(copy.some((text) => new RegExp(`\\b${word}`, 'i').test(text)), `no control says "${word}"`).toBe(true)
    }
  })
})
