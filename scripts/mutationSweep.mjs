/**
 * Mutation sweep: break the code on purpose, and see whether the suite notices.
 *
 * Run: npm run mutation      (a few minutes — the suite runs once per mutation)
 *
 * This exists because a green suite is not the same as a guarded one. The frame
 * variants shipped looking identical behind a test that pinned their exact
 * values, and the chamber moods shipped with two of six the same colour behind
 * a test that only checked each was *a* colour. Reading tests did not catch
 * either. Breaking the code did.
 *
 * The mutations below are deliberately narrow: constants whose *value* carries a
 * qualitative property — a perceptible blur, a visual distinction, a memory
 * bound, a safety margin — where it is easy to test the mechanism and never the
 * value. That is the failure this catches; ordinary logic is already covered by
 * ordinary tests.
 *
 * A surviving mutation is not automatically a bug. It means nothing would tell
 * you if that behaviour broke, which is worth knowing either way.
 *
 * Adding one: pick a change a user would notice, and phrase `breaks` as what
 * they would see.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** @type {{file: string, from: string, to: string, breaks: string}[]} */
const MUTATIONS = [
  {
    file: 'src/renderer/canvas/chamberIdentity.ts',
    from: "accent: '#d67878'", to: "accent: '#a6adb5'",
    breaks: 'two board moods become the same colour',
  },
  {
    file: 'src/renderer/canvas/overlays/boardChromeViewModel.ts',
    from: "case 'relic':\n      return { cornerSize: 24", to: "case 'relic':\n      return { cornerSize: 10",
    breaks: 'two frame variants become indistinguishable',
  },
  {
    file: 'src/renderer/canvas/visionModes.ts',
    from: 'SQUINT_BLUR_PX = 7', to: 'SQUINT_BLUR_PX = 0',
    breaks: 'the squint check stops blurring',
  },
  {
    file: 'src/renderer/canvas/CanvasBackground.tsx',
    from: 'MIN_DOT_SPACING_PX = 12', to: 'MIN_DOT_SPACING_PX = 0',
    breaks: 'the dot grid collapses into noise when zoomed out',
  },
  {
    file: 'src/renderer/canvas/snapping/snapEngine.ts',
    from: 'SNAP_THRESHOLD_SCREEN = 8', to: 'SNAP_THRESHOLD_SCREEN = 0',
    breaks: 'snapping never engages',
  },
  {
    file: 'src/renderer/canvas/items/codeSnippet.ts',
    from: 'maxLines: 5000', to: 'maxLines: 1',
    breaks: 'the tokenizer gives up after one line',
  },
  {
    file: 'src/main/clickThroughRegion.ts',
    from: 'CLICK_THROUGH_CAPTURE_MARGIN_PX = 48', to: 'CLICK_THROUGH_CAPTURE_MARGIN_PX = 0',
    breaks: 'the click-through Stop panel loses its approach halo',
  },
  {
    file: 'src/renderer/ui/boardSnapshots.ts',
    from: 'SNAPSHOT_MAX = 16', to: 'SNAPSHOT_MAX = 100000',
    breaks: 'the save filmstrip keeps every frame in memory',
  },
  {
    file: 'src/main/permissions.ts',
    from: "'clipboard-sanitized-write',\n  // The fullscreen", to: "'clipboard-sanitized-write', 'geolocation',\n  // The fullscreen",
    breaks: 'the permission allowlist quietly grows',
  },
  {
    file: 'src/main/externalLinks.ts',
    from: "new Set(['http:', 'https:', 'mailto:'])", to: "new Set(['http:', 'https:', 'mailto:', 'file:'])",
    breaks: 'a shared project can open a local executable',
  },
  {
    file: 'src/main/dataUrl.ts',
    from: "((?:;[^;]*)*?);base64,", to: ");base64,",
    breaks: 'a recorded voice memo stops saving',
  },
]

const suitePasses = () => {
  try {
    execSync('npx vitest run --silent', { cwd: root, stdio: 'pipe', timeout: 600_000 })
    return true
  } catch {
    return false
  }
}

const survivors = []
let restore = null

// Source files are edited in place, so a crash or a Ctrl-C must still put them
// back. Both paths run the same restore.
const putBack = () => { if (restore) { writeFileSync(restore.path, restore.original); restore = null } }
process.on('SIGINT', () => { putBack(); process.exit(130) })

console.log(`Running ${MUTATIONS.length} mutations. Each runs the whole suite, so this takes a few minutes.\n`)

try {
  for (const { file, from, to, breaks } of MUTATIONS) {
    const path = join(root, file)
    const original = readFileSync(path, 'utf8')

    if (!original.includes(from)) {
      console.log(`  STALE     ${breaks}\n            pattern no longer in ${file} — update the mutation`)
      survivors.push({ breaks, reason: 'stale' })
      continue
    }

    restore = { path, original }
    writeFileSync(path, original.replace(from, to))
    const survived = suitePasses()
    putBack()

    console.log(`  ${survived ? 'SURVIVED ' : 'caught   '} ${breaks}`)
    if (survived) survivors.push({ breaks, reason: 'unguarded' })
  }
} finally {
  putBack()
}

if (survivors.length === 0) {
  console.log(`\nAll ${MUTATIONS.length} caught. Every behaviour listed has a test that would notice it breaking.`)
  process.exit(0)
}

console.log(`\n${survivors.length} of ${MUTATIONS.length} survived:\n`)
for (const s of survivors) {
  console.log(s.reason === 'stale'
    ? `  - ${s.breaks} (mutation is stale, not necessarily unguarded)`
    : `  - ${s.breaks} — nothing would tell you`)
}
console.log('\nEither add a test that would catch it, or update the mutation if the code moved on.')
process.exit(1)
