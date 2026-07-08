# Archive Rite Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `.citadelz` import/export enforce real decompressed byte limits, report progress through a themed modal + the mascot, and surface failures to the user instead of swallowing them.

**Architecture:** Main-process extraction becomes an incremental, bounded-concurrency loop (`extractCitadelZip`) that counts actual buffer bytes and pushes throttled `archive:progress` events over a new main→renderer channel. The renderer gains a small zustand progress store feeding a full-screen `ArchiveRiteOverlay`, and `inscribe()` gains a danger tone for error toasts. Spec: `docs/superpowers/specs/2026-07-08-citadelz-archive-rite-hardening-design.md`.

**Tech Stack:** Electron IPC, JSZip, Zustand, React, Vitest.

## Global Constraints

- Renderer never touches `fs`; all I/O through the `window.ipc` bridge (preload already exposes `invoke`/`on`).
- All colours via CSS variables (`--bg-panel`, `--border`, `--text-primary`, `--text-accent`, `--accent-danger`). Fonts: `var(--font-display)` (Cinzel) for headers, `var(--font-body)` for body.
- Respect `prefers-reduced-motion`: overlay bar shimmer becomes a static fill.
- Mascot effects only via `useMascotStore.getState().triggerEffect(name, progress?, source?)`; `progress-fill` takes a 0–1 second argument.
- File operations never push `CanvasEvent`s (unchanged behavior).
- Existing limits stay: 5,000 entries, 512MB/entry, 2GB total (`DEFAULT_LIMITS` in `src/main/archiveZip.ts`).
- Never use `window.prompt`.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run tests with `npx vitest run <file>` (bare `npm run test` is watch mode).

---

### Task 1: `createProgressThrottle` + `extractCitadelZip` in archiveZip

**Files:**
- Modify: `src/main/archiveZip.ts`
- Test: `src/main/archiveZip.test.ts`

**Interfaces:**
- Consumes: existing `ArchiveZipManifest`, `ArchiveZipLimits`, `DEFAULT_LIMITS`, `resolveSafeAssetOutputPath` from `src/main/archiveZip.ts`.
- Produces (Task 2 relies on these exact signatures):
  ```ts
  export type ExtractProgress = { done: number; total: number; bytes: number }
  export type ExtractOptions = {
    limits?: ArchiveZipLimits
    onProgress?: (progress: ExtractProgress) => void
    concurrency?: number
  }
  export async function extractCitadelZip(
    manifest: ArchiveZipManifest, assetDir: string, options?: ExtractOptions,
  ): Promise<void>
  export function createProgressThrottle(
    send: (percent: number) => void, minIntervalMs?: number,  // default 50
  ): (percent: number) => void
  ```

- [ ] **Step 1: Write the failing tests**

Append to `src/main/archiveZip.test.ts` (add imports at top: `mkdtempSync`, `existsSync`, `readdirSync` from `'fs'`; `tmpdir` from `'os'`; `join` from `'path'`; `vi`, `afterEach` from `'vitest'`; `createProgressThrottle`, `extractCitadelZip` from `'./archiveZip'`; and `type JSZipObject` usage via the existing `JSZip` import):

```ts
function fakeEntry(name: string, content: Buffer, claimedSize?: number): JSZip.JSZipObject {
  return {
    name,
    dir: false,
    _data: { uncompressedSize: claimedSize ?? content.length },
    async: () => Promise.resolve(content),
  } as unknown as JSZip.JSZipObject
}

function fakeManifest(assets: JSZip.JSZipObject[]): Parameters<typeof extractCitadelZip>[0] {
  return { project: fakeEntry('project.citadel', Buffer.from('{}')), assets, totalBytes: 0 }
}

describe('extractCitadelZip', () => {
  const dirs: string[] = []
  const tempDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'citadel-extract-'))
    dirs.push(dir)
    return dir
  }

  it('writes assets and reports monotonic progress ending at done === total', async () => {
    const assetDir = tempDir()
    const calls: { done: number; total: number; bytes: number }[] = []
    await extractCitadelZip(
      fakeManifest([
        fakeEntry('assets/a.png', Buffer.from('aaaa')),
        fakeEntry('assets/b.png', Buffer.from('bb')),
      ]),
      assetDir,
      { onProgress: (p) => calls.push(p), concurrency: 1 },
    )
    expect(existsSync(join(assetDir, 'a.png'))).toBe(true)
    expect(existsSync(join(assetDir, 'b.png'))).toBe(true)
    expect(calls.map((c) => c.done)).toEqual([1, 2])
    expect(calls.at(-1)).toEqual({ done: 2, total: 2, bytes: 6 })
  })

  it('rejects an entry whose real bytes exceed maxEntryBytes even when its header lies', async () => {
    const assetDir = tempDir()
    const liar = fakeEntry('assets/liar.bin', Buffer.alloc(64), 4)  // claims 4 bytes, is 64
    await expect(
      extractCitadelZip(fakeManifest([liar]), assetDir, { limits: { maxEntryBytes: 32 } }),
    ).rejects.toThrow(/too large/i)
  })

  it('rejects when real total bytes exceed maxTotalBytes and cleans up written files', async () => {
    const assetDir = tempDir()
    await expect(
      extractCitadelZip(
        fakeManifest([
          fakeEntry('assets/first.bin', Buffer.alloc(30)),
          fakeEntry('assets/second.bin', Buffer.alloc(30)),
        ]),
        assetDir,
        { limits: { maxTotalBytes: 40 }, concurrency: 1 },
      ),
    ).rejects.toThrow(/too large/i)
    expect(readdirSync(assetDir)).toEqual([])  // first.bin was unlinked
  })
})

describe('createProgressThrottle', () => {
  afterEach(() => vi.useRealTimers())

  it('drops events inside the interval but always lets 100 through', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const sent: number[] = []
    const send = createProgressThrottle((p) => sent.push(p), 50)
    send(1)                       // first always sends
    send(2)                       // dropped (0ms later)
    vi.setSystemTime(60)
    send(3)                       // sent (60ms later)
    send(100)                     // 100 always sends
    expect(sent).toEqual([1, 3, 100])
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/main/archiveZip.test.ts`
Expected: FAIL — `extractCitadelZip` / `createProgressThrottle` are not exported. The pre-existing tests still pass.

- [ ] **Step 3: Implement in `src/main/archiveZip.ts`**

Change the imports at the top of the file and add the new exports at the bottom:

```ts
import { promises as fsp } from 'fs'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
```

```ts
export type ExtractProgress = { done: number; total: number; bytes: number }

export type ExtractOptions = {
  limits?: ArchiveZipLimits
  onProgress?: (progress: ExtractProgress) => void
  concurrency?: number
}

export async function extractCitadelZip(
  manifest: ArchiveZipManifest,
  assetDir: string,
  options: ExtractOptions = {},
): Promise<void> {
  const effective = { ...DEFAULT_LIMITS, ...options.limits }
  const total = manifest.assets.length
  const queue = [...manifest.assets]
  const written: string[] = []
  let done = 0
  let bytes = 0
  let failed = false

  const worker = async (): Promise<void> => {
    while (!failed) {
      const file = queue.shift()
      if (!file) return
      const outPath = resolveSafeAssetOutputPath(assetDir, file.name)
      // Enforce limits on actual decompressed bytes — headers can lie.
      const buf = await file.async('nodebuffer')
      if (buf.length > effective.maxEntryBytes) throw new Error(`Archive entry too large: ${file.name}`)
      bytes += buf.length
      if (bytes > effective.maxTotalBytes) throw new Error('Archive is too large')
      await fsp.mkdir(dirname(outPath), { recursive: true })
      await fsp.writeFile(outPath, buf)
      written.push(outPath)
      done += 1
      options.onProgress?.({ done, total, bytes })
    }
  }

  const workerCount = Math.max(1, Math.min(options.concurrency ?? 4, total))
  const results = await Promise.allSettled(
    Array.from({ length: workerCount }, () => worker().catch((error) => { failed = true; throw error })),
  )
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failure) {
    // A poisoned archive must not leave partial assets behind.
    await Promise.allSettled(written.map((path) => fsp.unlink(path)))
    throw failure.reason
  }
}

export function createProgressThrottle(
  send: (percent: number) => void,
  minIntervalMs = 50,
): (percent: number) => void {
  let lastSentAt = -Infinity
  return (percent) => {
    const now = Date.now()
    if (percent < 100 && now - lastSentAt < minIntervalMs) return
    lastSentAt = now
    send(percent)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/main/archiveZip.test.ts`
Expected: PASS (all, including pre-existing).

- [ ] **Step 5: Commit**

```bash
git add src/main/archiveZip.ts src/main/archiveZip.test.ts
git commit -m "feat: honest byte-limit extraction with progress for .citadelz

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Rework `import:zip` / `export:zip` handlers — async, progress events, structured results

**Files:**
- Modify: `src/main/ipc.ts` (imports at line 2, `writeZipProject` ~line 144, `export:zip` handler ~line 408, `import:zip` handler ~line 419)

**Interfaces:**
- Consumes: `extractCitadelZip`, `createProgressThrottle` from Task 1.
- Produces (Tasks 4/6 rely on these):
  - Push channel `archive:progress` (main→renderer), payload `{ op: 'import' | 'export', percent: number }` where percent is 0–100.
  - `import:zip` returns `{ ok: true, projectJson: string, assetDir: string } | { ok: false, reason: string }` (was: bare `{ projectJson, assetDir }` or throw).
  - `export:zip` returns `{ ok: true, path: string } | { ok: false, reason?: string }` (`reason` absent means user cancelled the dialog).

No unit tests: `registerIpcHandlers` requires a live Electron `ipcMain`. The logic lives in Task 1's tested functions; this task is wiring, verified by typecheck plus Task 7's manual pass.

- [ ] **Step 1: Update imports and `writeZipProject`**

In `src/main/ipc.ts`, extend the fs import (line 2):

```ts
import { copyFileSync, existsSync, mkdirSync, promises as fsp, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
```

Extend the archiveZip import (line 5):

```ts
import { createProgressThrottle, extractCitadelZip, inspectCitadelZip } from './archiveZip'
```

(`resolveSafeAssetOutputPath` is no longer used in ipc.ts — extraction owns it now.)

Give `writeZipProject` an optional progress callback (JSZip's `generateAsync` supports an `onUpdate` second argument with `{ percent }`):

```ts
async function writeZipProject(
  filePath: string,
  projectJson: string,
  assetPaths: string[],
  onPercent?: (percent: number) => void,
): Promise<void> {
  const prepared = prepareZipProject(projectJson, assetPaths)
  const zip = new JSZip()
  zip.file('project.citadel', prepared.projectJson)
  for (const asset of prepared.assets) {
    try {
      zip.file(asset.zipPath, readFileSync(asset.sourcePath))
    } catch { /* skip missing */ }
  }
  const buf = await zip.generateAsync(
    { type: 'nodebuffer', compression: 'DEFLATE' },
    (meta) => onPercent?.(meta.percent),
  )
  await fsp.writeFile(filePath, buf)
}
```

The `file:save` call site (`await writeZipProject(path, data, collectProjectAssetPaths(data))`) needs no change.

- [ ] **Step 2: Replace the `export:zip` handler**

```ts
ipcMain.handle('export:zip', async (e, { projectJson, assetPaths, filename }: { projectJson: string; assetPaths: string[]; filename: string }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: 'Citadel Archive', extensions: ['citadelz'] }],
  })
  if (canceled || !filePath) return { ok: false }

  try {
    const sendProgress = createProgressThrottle((percent) => {
      e.sender.send('archive:progress', { op: 'export', percent })
    })
    await writeZipProject(filePath, projectJson, assetPaths, sendProgress)
    sendProgress(100)
    return { ok: true, path: filePath }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
})
```

- [ ] **Step 3: Replace the `import:zip` handler**

```ts
// ── import:zip ─────────────────────────────────────────────────────────────
ipcMain.handle('import:zip', async (e, { zipPath }: { zipPath: string }) => {
  try {
    const buf = await fsp.readFile(zipPath)
    const zip = await JSZip.loadAsync(buf)
    const manifest = inspectCitadelZip(zip)
    const rawProjectJson = await manifest.project.async('string')

    const assetDir = join(dirname(zipPath), '_citadel_assets')
    const sendProgress = createProgressThrottle((percent) => {
      e.sender.send('archive:progress', { op: 'import', percent })
    })
    await extractCitadelZip(manifest, assetDir, {
      onProgress: ({ done, total }) => sendProgress(Math.round((done / Math.max(1, total)) * 100)),
    })
    sendProgress(100)

    return { ok: true, projectJson: resolveImportedZipProject(rawProjectJson, assetDir), assetDir }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
})
```

Note the old handler's `mkdirSync(assetDir)` guard is gone on purpose — `extractCitadelZip` mkdirs per file. An archive with zero assets never needs the dir.

- [ ] **Step 4: Typecheck and run the main-process tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run src/main`
Expected: tsc exit 0; all main tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat: archive import/export send progress and structured results

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `inscribe()` danger tone

**Files:**
- Modify: `src/renderer/ui/toasts/inscriptionToastStore.ts`
- Modify: `src/renderer/ui/toasts/InscriptionToasts.tsx`
- Test: `src/renderer/ui/toasts/inscriptionToastStore.test.ts` (create)

**Interfaces:**
- Produces (Task 6 relies on this):
  ```ts
  export type InscribeOptions = { tone?: 'default' | 'danger'; lifetimeMs?: number }
  export function inscribe(text: string, options?: InscribeOptions): void
  export const TOAST_DANGER_LIFETIME_MS = 6000  // danger default
  // InscriptionToast gains: tone: 'default' | 'danger'; lifetimeMs: number
  ```
- Existing call sites (`inscribe('Archive opened')` etc.) must keep working unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/renderer/ui/toasts/inscriptionToastStore.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  inscribe,
  TOAST_DANGER_LIFETIME_MS,
  TOAST_LIFETIME_MS,
  useInscriptionToastStore,
} from './inscriptionToastStore'

describe('inscribe tones', () => {
  afterEach(() => {
    vi.useRealTimers()
    useInscriptionToastStore.setState({ toasts: [] })
  })

  it('defaults to the default tone and standard lifetime', () => {
    vi.useFakeTimers()
    inscribe('Archive opened')
    const toast = useInscriptionToastStore.getState().toasts[0]
    expect(toast.tone).toBe('default')
    expect(toast.lifetimeMs).toBe(TOAST_LIFETIME_MS)
    vi.advanceTimersByTime(TOAST_LIFETIME_MS + 1)
    expect(useInscriptionToastStore.getState().toasts).toEqual([])
  })

  it('danger tone lives longer and records its tone', () => {
    vi.useFakeTimers()
    inscribe('The archive resisted: too large', { tone: 'danger' })
    const toast = useInscriptionToastStore.getState().toasts[0]
    expect(toast.tone).toBe('danger')
    expect(toast.lifetimeMs).toBe(TOAST_DANGER_LIFETIME_MS)
    vi.advanceTimersByTime(TOAST_LIFETIME_MS + 1)
    expect(useInscriptionToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(TOAST_DANGER_LIFETIME_MS)
    expect(useInscriptionToastStore.getState().toasts).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/ui/toasts/inscriptionToastStore.test.ts`
Expected: FAIL — `TOAST_DANGER_LIFETIME_MS` not exported / `tone` undefined.

- [ ] **Step 3: Implement the store change**

Replace `src/renderer/ui/toasts/inscriptionToastStore.ts` content:

```ts
import { create } from 'zustand'
import { nanoid } from 'nanoid'

export const TOAST_LIFETIME_MS = 2600
export const TOAST_DANGER_LIFETIME_MS = 6000
export const TOAST_MAX_STACK = 3

export type InscribeTone = 'default' | 'danger'
export type InscribeOptions = { tone?: InscribeTone; lifetimeMs?: number }

export type InscriptionToast = {
  id: string
  text: string
  tone: InscribeTone
  lifetimeMs: number
}

type InscriptionToastState = {
  toasts: InscriptionToast[]
  inscribe: (text: string, options?: InscribeOptions) => void
  dismiss: (id: string) => void
}

// Verbal confirmations ("Archive opened") — feature code calls inscribe();
// only InscriptionToasts.tsx renders the stack.
export const useInscriptionToastStore = create<InscriptionToastState>((set) => ({
  toasts: [],

  inscribe: (text, options = {}) => {
    const tone = options.tone ?? 'default'
    const lifetimeMs = options.lifetimeMs ?? (tone === 'danger' ? TOAST_DANGER_LIFETIME_MS : TOAST_LIFETIME_MS)
    const toast: InscriptionToast = { id: nanoid(), text, tone, lifetimeMs }
    set((s) => ({ toasts: [...s.toasts, toast].slice(-TOAST_MAX_STACK) }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }))
    }, lifetimeMs)
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function inscribe(text: string, options?: InscribeOptions): void {
  useInscriptionToastStore.getState().inscribe(text, options)
}
```

- [ ] **Step 4: Render the tone in `InscriptionToasts.tsx`**

In the toast `<div>` (line ~45), the animation duration is currently baked into the `.citadel-inscription-toast` CSS rule as `2600ms`. Change the CSS rule to drop the duration source of truth and set it per toast:

In the `<style>` block, change:

```css
.citadel-inscription-toast {
  animation: inscription-rise 2600ms ease-out forwards;
}
```

to:

```css
.citadel-inscription-toast {
  animation-name: inscription-rise;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}
```

And on the toast `<div>` style object, add/replace:

```tsx
style={{
  animationDuration: `${toast.lifetimeMs}ms`,
  background: 'color-mix(in srgb, var(--bg-panel) 94%, transparent)',
  border: toast.tone === 'danger' ? '1px solid var(--accent-danger)' : '1px solid var(--border)',
  borderRadius: 4,
  boxShadow: 'var(--shadow-md)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  letterSpacing: '0.02em',
  padding: '6px 14px',
}}
```

And the glyph span colour becomes tone-aware:

```tsx
<span style={{ color: toast.tone === 'danger' ? 'var(--accent-danger)' : 'var(--text-accent)', fontFamily: 'var(--font-display)', marginRight: 6 }}>❧</span>
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/renderer/ui/toasts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS / exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/ui/toasts/inscriptionToastStore.ts src/renderer/ui/toasts/inscriptionToastStore.test.ts src/renderer/ui/toasts/InscriptionToasts.tsx
git commit -m "feat: danger tone for inscription toasts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `archiveProgressStore` + IPC listener

**Files:**
- Create: `src/renderer/ui/archiveProgressStore.ts`
- Test: `src/renderer/ui/archiveProgressStore.test.ts`

**Interfaces:**
- Consumes: `archive:progress` payload shape from Task 2; `useMascotStore` (`triggerEffect('progress-fill', zeroToOne)`).
- Produces (Tasks 5/6 rely on these):
  ```ts
  export type ArchiveRiteOp = 'import' | 'export'
  export type ArchiveRite = { op: ArchiveRiteOp; percent: number; label?: string }
  export const useArchiveProgressStore: /* zustand store */
  // state: { rite: ArchiveRite | null; beginRite(op); updateRite(percent, label?); endRite() }
  export function registerArchiveProgressListener(): () => void
  ```

- [ ] **Step 1: Write the failing test**

Create `src/renderer/ui/archiveProgressStore.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { useArchiveProgressStore } from './archiveProgressStore'

describe('archiveProgressStore', () => {
  afterEach(() => useArchiveProgressStore.setState({ rite: null }))

  it('begins at zero percent', () => {
    useArchiveProgressStore.getState().beginRite('import')
    expect(useArchiveProgressStore.getState().rite).toEqual({ op: 'import', percent: 0 })
  })

  it('clamps updates to 0-100 and keeps the op', () => {
    const store = useArchiveProgressStore.getState()
    store.beginRite('export')
    store.updateRite(42, 'relic.png')
    expect(useArchiveProgressStore.getState().rite).toEqual({ op: 'export', percent: 42, label: 'relic.png' })
    useArchiveProgressStore.getState().updateRite(140)
    expect(useArchiveProgressStore.getState().rite?.percent).toBe(100)
  })

  it('ignores updates when no rite is active and clears on end', () => {
    useArchiveProgressStore.getState().updateRite(50)
    expect(useArchiveProgressStore.getState().rite).toBeNull()
    useArchiveProgressStore.getState().beginRite('import')
    useArchiveProgressStore.getState().endRite()
    expect(useArchiveProgressStore.getState().rite).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/ui/archiveProgressStore.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the store**

Create `src/renderer/ui/archiveProgressStore.ts`:

```ts
import { create } from 'zustand'
import { useMascotStore } from '../store/mascotStore'

export type ArchiveRiteOp = 'import' | 'export'
export type ArchiveRite = { op: ArchiveRiteOp; percent: number; label?: string }

type ArchiveProgressState = {
  rite: ArchiveRite | null
  beginRite: (op: ArchiveRiteOp) => void
  updateRite: (percent: number, label?: string) => void
  endRite: () => void
}

// Drives the ArchiveRiteOverlay during .citadelz import/export. Fed by the
// archive:progress IPC push channel; begin/end bracket the invoke in the flows.
export const useArchiveProgressStore = create<ArchiveProgressState>((set, get) => ({
  rite: null,

  beginRite: (op) => set({ rite: { op, percent: 0 } }),

  updateRite: (percent, label) => {
    const rite = get().rite
    if (!rite) return
    const clamped = Math.min(100, Math.max(0, percent))
    set({ rite: { ...rite, percent: clamped, label: label ?? rite.label } })
  },

  endRite: () => set({ rite: null }),
}))

type ProgressPayload = { op: ArchiveRiteOp; percent: number; label?: string }
type IpcOn = { on?: (channel: string, listener: (...args: unknown[]) => void) => () => void }

// Called once from App startup. Returns the unsubscribe function.
export function registerArchiveProgressListener(): () => void {
  const ipc = (window as unknown as { ipc?: IpcOn }).ipc
  if (!ipc?.on) return () => {}
  return ipc.on('archive:progress', (payload) => {
    const { percent, label } = payload as ProgressPayload
    useArchiveProgressStore.getState().updateRite(percent, label)
    useMascotStore.getState().triggerEffect('progress-fill', Math.min(1, Math.max(0, percent / 100)))
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/ui/archiveProgressStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/ui/archiveProgressStore.ts src/renderer/ui/archiveProgressStore.test.ts
git commit -m "feat: archive rite progress store fed by archive:progress events

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `ArchiveRiteOverlay` + App mount

**Files:**
- Create: `src/renderer/ui/ArchiveRiteOverlay.tsx`
- Test: `src/renderer/ui/ArchiveRiteOverlay.test.tsx`
- Modify: `src/renderer/App.tsx` (import block ~line 25; shell JSX next to `<InscriptionToasts />` at ~line 1019; a `useEffect` for the listener near the other startup effects)

**Interfaces:**
- Consumes: `useArchiveProgressStore`, `registerArchiveProgressListener` from Task 4.
- Produces: `export function ArchiveRiteOverlay(): React.ReactElement | null` — no props.

- [ ] **Step 1: Write the failing test**

Create `src/renderer/ui/ArchiveRiteOverlay.test.tsx` (this repo tests React components with @testing-library/react — see `src/renderer/canvas/TextEditOverlay.test.tsx` for the established pattern):

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ArchiveRiteOverlay } from './ArchiveRiteOverlay'
import { useArchiveProgressStore } from './archiveProgressStore'

describe('ArchiveRiteOverlay', () => {
  afterEach(() => useArchiveProgressStore.setState({ rite: null }))

  it('renders nothing when no rite is active', () => {
    const { container } = render(<ArchiveRiteOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the unsealing header and percent while importing', () => {
    useArchiveProgressStore.setState({ rite: { op: 'import', percent: 37 } })
    render(<ArchiveRiteOverlay />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/unsealing the archive/i)).toBeTruthy()
    expect(screen.getByText('37%')).toBeTruthy()
  })

  it('shows the sealing header while exporting', () => {
    useArchiveProgressStore.setState({ rite: { op: 'export', percent: 80 } })
    render(<ArchiveRiteOverlay />)
    expect(screen.getByText(/sealing the archive/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/ui/ArchiveRiteOverlay.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the overlay**

Create `src/renderer/ui/ArchiveRiteOverlay.tsx`:

```tsx
import React from 'react'
import { useArchiveProgressStore } from './archiveProgressStore'

// Full-screen veil shown while a .citadelz archive is being unsealed (import)
// or sealed (export). Blocks all interaction beneath it; not cancellable.
export function ArchiveRiteOverlay(): React.ReactElement | null {
  const rite = useArchiveProgressStore((s) => s.rite)
  if (!rite) return null

  const title = rite.op === 'import' ? 'Unsealing the archive…' : 'Sealing the archive…'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-panels)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--bg-canvas) 78%, transparent)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <style>{`
        @keyframes archive-rite-shimmer {
          from { background-position: -120px 0; }
          to   { background-position: 120px 0; }
        }
        .archive-rite-bar-fill {
          background-image: linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-accent) 35%, transparent), transparent);
          background-size: 120px 100%;
          background-repeat: no-repeat;
          animation: archive-rite-shimmer 1400ms linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .archive-rite-bar-fill { animation: none; background-image: none; }
        }
      `}</style>
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          boxShadow: 'var(--shadow-md)',
          minWidth: 320,
          padding: '22px 28px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em', marginBottom: 14 }}>
          {title}
        </div>
        <div style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 3, height: 8, overflow: 'hidden' }}>
          <div
            className="archive-rite-bar-fill"
            style={{ background: 'var(--text-accent)', height: '100%', transition: 'width 120ms linear', width: `${rite.percent}%` }}
          />
        </div>
        <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 11, marginTop: 10, opacity: 0.8 }}>
          {rite.percent}%{rite.label ? ` — ${rite.label}` : ''}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/ui/ArchiveRiteOverlay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount in `App.tsx`**

Add imports next to the `InscriptionToasts` import (~line 25):

```tsx
import { ArchiveRiteOverlay } from './ui/ArchiveRiteOverlay'
import { registerArchiveProgressListener } from './ui/archiveProgressStore'
```

Register the listener once — add near the app's other startup `useEffect`s:

```tsx
useEffect(() => registerArchiveProgressListener(), [])
```

Mount the overlay directly after `<InscriptionToasts />` (~line 1019):

```tsx
<InscriptionToasts />
<ArchiveRiteOverlay />
```

- [ ] **Step 6: Typecheck and run the renderer UI tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run src/renderer/ui`
Expected: exit 0 / PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/ui/ArchiveRiteOverlay.tsx src/renderer/ui/ArchiveRiteOverlay.test.tsx src/renderer/App.tsx
git commit -m "feat: archive rite progress overlay

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Wire the flows — structured results, rite bracketing, error surfacing

**Files:**
- Modify: `src/renderer/utils/projectFile.ts` (`loadProjectFromPath` ~line 198, `openProject` ~line 240, `openRecentProject` ~line 251, imports at top)
- Modify: `src/renderer/export/zipExport.ts`
- Modify: `CLAUDE.md` (IPC channel table)

**Interfaces:**
- Consumes: Task 2 result shapes, `useArchiveProgressStore` (Task 4), `inscribe(text, { tone: 'danger' })` (Task 3), `useMascotStore.getState().triggerEffect('fracture')`.
- Produces: no new exports; behavior change only (`openProject`/`openRecentProject` still return `boolean`).

Existing tests cover `projectFile` indirectly via `projectSchema`; the flow change is exercised by the full suite and Task 7's manual pass.

- [ ] **Step 1: Update `loadProjectFromPath` in `projectFile.ts`**

Add imports at the top of the file:

```ts
import { useArchiveProgressStore } from '../ui/archiveProgressStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { useMascotStore } from '../store/mascotStore'
```

Replace `loadProjectFromPath`:

```ts
async function loadProjectFromPath(path: string): Promise<boolean> {
  let json: string
  if (path.toLowerCase().endsWith('.citadelz')) {
    useArchiveProgressStore.getState().beginRite('import')
    try {
      const result = await ipc().invoke('import:zip', { zipPath: path }) as
        { ok: true; projectJson: string } | { ok: false; reason: string }
      if (!result.ok) throw new Error(result.reason)
      json = result.projectJson
    } finally {
      useArchiveProgressStore.getState().endRite()
    }
  } else {
    const loaded = await ipc().invoke('file:load', { path }) as { data: string }
    json = loaded.data
  }
  const file = deserialize(json)
  applyProject(file)
  currentFilePath = path
  resetSaveActivity()
  resetRecoveryAutosaveCache()
  notifyProjectPathChanged()
  rememberRecentProject(path).catch(console.error)
  return true
}
```

- [ ] **Step 2: Surface errors in `openProject` and `openRecentProject`**

Add a shared helper above `openProject`:

```ts
function surfaceOpenFailure(error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error)
  inscribe(`The archive resisted: ${reason}`, { tone: 'danger' })
  useMascotStore.getState().triggerEffect('fracture')
}
```

Change both catch blocks from `catch { return false }` to:

```ts
} catch (error) {
  surfaceOpenFailure(error)
  return false
}
```

- [ ] **Step 3: Update `zipExport.ts`**

Replace the file content:

```ts
import { useMascotStore } from '../store/mascotStore'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useArchiveProgressStore } from '../ui/archiveProgressStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'

export async function exportToZip(filename = 'citadel-archive.citadelz'): Promise<void> {
  const mascot = useMascotStore.getState()
  const canvas = useCanvasStore.getState()
  const history = useHistoryStore.getState()

  const projectJson = JSON.stringify({
    version: '0.1.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boards: canvas.boards,
    activeBoardId: canvas.activeBoardId,
    recordings: history.recordings,
  }, null, 2)

  // Collect all asset paths (src fields from items)
  const assetPaths: string[] = canvas.boards
    .flatMap((b) => b.items)
    .map((i) => i.src)
    .filter((s): s is string => !!s && !s.startsWith('http'))

  useArchiveProgressStore.getState().beginRite('export')
  mascot.triggerEffect('progress-fill', 0)
  try {
    const result = await window.ipc.invoke('export:zip', { projectJson, assetPaths, filename }) as
      { ok: boolean; reason?: string }
    if (result.ok) {
      mascot.triggerEffect('lightning-out')
    } else if (result.reason) {
      // reason absent = user cancelled the save dialog; stay silent then.
      inscribe(`The archive resisted: ${result.reason}`, { tone: 'danger' })
      mascot.triggerEffect('fracture')
    }
  } finally {
    useArchiveProgressStore.getState().endRite()
  }
}
```

- [ ] **Step 4: Document the channel in `CLAUDE.md`**

In the IPC channel table, update the `export:zip` row's Notes to `{ projectJson, assetPaths, filename }` → `{ ok, path? | reason? }`, update `import:zip` to `{ zipPath }` → `{ ok, projectJson?, assetDir? | reason? }`, and add:

```markdown
| `archive:progress` | m→r | `{ op: 'import' \| 'export', percent }` — throttled push during zip rites |
```

- [ ] **Step 5: Full verification**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: exit 0; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/utils/projectFile.ts src/renderer/export/zipExport.ts CLAUDE.md
git commit -m "feat: archive rites drive overlay, mascot, and failure toasts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Manual verification pass

**Files:** none (verification only).

Launch the app with CDP driving available:

```bash
npm run dev -- -- --remote-debugging-port=9222
```

(Playwright `_electron.launch` fails on this machine — use `connectOverCDP`. The app runs at zoomFactor 1.3; probe positions with `getBoundingClientRect`, not pixel hunting.)

- [ ] **Step 1: Happy-path export.** Open a project with a handful of image relics, run zip export, choose a path. Expected: "Sealing the archive…" overlay with advancing bar, mascot progress-fill, then lightning-out; `.citadelz` created.

- [ ] **Step 2: Happy-path import.** Open the exported `.citadelz`. Expected: "Unsealing the archive…" overlay, assets land in `_citadel_assets/`, project opens, lightning-in + "Archive opened" toast (existing App handler).

- [ ] **Step 3: Broken archive.** Hand-craft a bad zip (e.g. rename a `.zip` containing `notes/readme.txt` to `.citadelz`, or build one with an `assets/../escape.png` entry via a script). Open it. Expected: danger toast "The archive resisted: …" with the real reason, mascot fracture, no partial `_citadel_assets` files, overlay gone.

- [ ] **Step 4: Reduced motion.** With Windows "Animation effects" off (Settings → Accessibility → Visual effects), repeat an import. Expected: static bar fill, no shimmer; mascot falls back to brightness pulse (existing behavior).

- [ ] **Step 5: Clean up.** Delete `%APPDATA%/citadel/recovery.citadel` after CDP sessions so no junk restore offer appears.

---

## Self-Review Notes

- Spec §1 → Tasks 1–2 (extraction, byte enforcement, cleanup, async fs, throttled events, structured results).
- Spec §2 → Task 2 (channel) + Task 6 (CLAUDE.md row).
- Spec §3 → Tasks 4–5 (store, listener, overlay, mascot fill, reduced motion, App mount).
- Spec §4 → Task 3 (danger tone) + Task 6 (open/export failure surfacing, fracture).
- Spec §5 → tests inside Tasks 1/3/4/5, manual pass in Task 7.
- Type consistency: `ExtractProgress`/`ExtractOptions` (T1) used in T2; `ArchiveRiteOp`/store API (T4) used in T5/T6; `InscribeOptions` (T3) used in T6; result shapes (T2) consumed in T6.
