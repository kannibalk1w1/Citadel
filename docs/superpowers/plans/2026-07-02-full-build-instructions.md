# Citadel Full Build Instructions (Handoff Plan)

> **For agentic workers:** Work through this plan strictly task-by-task, in order. Steps use checkbox (`- [ ]`) syntax — check them off as you go by editing this file, so progress survives across sessions. Complete each task's verification steps and commit before starting the next task. Do not batch multiple tasks into one commit. If a step's expected outcome doesn't match reality, stop and investigate before proceeding — do not improvise around a failing gate.
>
> Two tasks (4 and 5) are **design checkpoints**: they require writing a design spec and getting user approval before any implementation. Do not code past a checkpoint that hasn't been approved.

**Goal:** Take the Citadel repo from its current state (uncommitted profiling harness on `codex/media-preview-gates`) through the remaining roadmap: land the harness, capture the real-media profile, finish the Phase 3 leftovers, then open Phase 5 (Atmospheric Chambers) spec-first.

**Architecture:** Citadel is an Electron + React + TypeScript infinite-canvas app. Konva renders canvas primitives; video/YouTube/audio/3D are DOM-layer elements synced to canvas coordinates; arrows are SVG overlays. State lives in four Zustand slices (`canvasStore`, `historyStore`, `uiStore`, `mascotStore`). All file I/O goes through IPC. Undo/redo and recording share one `CanvasEvent` log.

**Tech Stack:** Electron, React 18, TypeScript, Konva/react-konva, Three.js, Zustand 4, electron-vite, Vitest, Playwright.

## Global Constraints

Copied from `CLAUDE.md` — every task inherits these:

- Renderer never touches `fs` directly; all file I/O via IPC channels in `src/main/ipc.ts` (`namespace:action` pattern).
- Keybinds go through `keybindResolver` → `ActionName` → handler; never hardcode key handling.
- Every state mutation that should be undoable dispatches a `CanvasEvent` via `historyStore` (undo/redo and recording are the same log).
- Tool modes gate all canvas interactions (`uiStore.toolMode`); interactions must not bleed between modes.
- Video, YouTube, 3D, audio render in the DOM layer, not Konva.
- Colours come from CSS variables only; mascot effect palette is strictly black/white/grey (`#0a0a0a`/`#ffffff`/`#c8c8c8`/`#505050`/`#2a2a2a`, plus `#8b0000` recording eye and `#5a0000` error fracture only).
- Mascot effects are triggered only via `mascotStore.triggerEffect(name)`.
- Respect `prefers-reduced-motion` for any animation (mascot effects degrade to a brightness pulse; canvas atmospherics need a static fallback).
- Save format uses relative asset paths, never base64.
- Product language is archival: Relic, Inscription, Thread, Sigil, Chamber, Index, Binding, Rite. No Character/Place/Event first-class concepts.
- Do not add persistent SVG ornamentation without a profile check against the large-chamber fixture (`src/renderer/performance/largeBoardFixture.ts`).
- Commands: `npm test -- --run <files>` (Vitest), `npm run typecheck`, `npm run build`, `npm run dev`.
- Workflow convention in this repo: each feature gets a design spec in `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md` and an implementation plan in `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` before implementation. For any task marked **spec-first** below, the workflow is:
  1. Read the relevant existing code and the roadmap section.
  2. Write the design spec: problem, goals, non-goals, proposed approach, alternatives considered and why they were rejected, data/type changes, and how the design honours the Global Constraints. Match the tone and depth of the existing specs in `docs/superpowers/specs/` (read one or two first, e.g. `2026-06-12-asset-metadata-thumbnails-design.md`).
  3. **Stop and present the spec to the user for approval. Do not implement an unapproved spec.**
  4. After approval, write the implementation plan as bite-sized TDD tasks (failing test → run to see it fail → minimal implementation → run to see it pass → commit), with exact file paths and complete code in every step — same format as this document and the existing plans.
  5. Execute that plan task-by-task.
- Development style for all code tasks: test-driven. Write the failing test first, watch it fail, implement minimally, watch it pass, commit. Keep files small and single-responsibility; follow existing patterns in neighbouring files rather than inventing new ones.
- Commit style: conventional prefixes (`feat:`, `docs:`, `style:`, `fix:`), small frequent commits.

## Current State (verified 2026-07-02)

- Branch: `codex/media-preview-gates`, ahead of nothing remote-tracked; main branch is `master`. Remote: `https://github.com/kannibalk1w1/Citadel.git`.
- **Uncommitted work** (complete, tested, not yet committed):
  - New: `src/renderer/performance/mediaPreviewProfile.ts` + `.test.ts` — profile computation.
  - New: `src/renderer/performance/mediaPreviewProfileHarness.ts` + `.test.ts` — dev-only harness exposed as `window.__citadelMediaPreviewProfile` when the URL contains `profile=media-preview` or `#profile-media-preview`.
  - Modified: `src/renderer/App.tsx` — installs the harness on mount (dev only).
  - Modified: `docs/citadel-performance-roadmap.md` — queue item 1 rewritten, sweep-attempt doc linked.
  - New docs: `docs/citadel-large-chamber-profile-2026-06-30-real-media-sweep-attempt.md`, `docs/superpowers/plans/2026-06-30-media-preview-profiling-harness.md`, `docs/superpowers/specs/2026-06-30-media-preview-profiling-harness-design.md`.
  - `.agents/` and `skills-lock.json` are tool artifacts — do **not** commit them; leave untracked (or add to `.gitignore` if they get in the way).
- Phases 1–2 complete. Phase 3 second slice complete (image thumbnails, GIF first frames, video posters, 3D static captures, unified `preview-cache`). Phase 4 (thread meanings, searchable labels, binding feedback) already implemented — see `src/renderer/canvas/connections/threadMeaning.ts`, `ConnectionProperties.tsx`, `itemSearchModel.ts`.
- Remaining per roadmap: real-media profile run (queue item 1), progressive text/label detail at far zoom, worker-based thumbnail generation (gated), Phase 5 Atmospheric Chambers.

---

### Task 1: Land the media preview profiling harness

**Files:**
- Commit (already written, do not modify):
  - `src/renderer/performance/mediaPreviewProfile.ts`, `mediaPreviewProfile.test.ts`
  - `src/renderer/performance/mediaPreviewProfileHarness.ts`, `mediaPreviewProfileHarness.test.ts`
  - `src/renderer/App.tsx`
  - `docs/citadel-performance-roadmap.md`
  - `docs/citadel-large-chamber-profile-2026-06-30-real-media-sweep-attempt.md`
  - `docs/superpowers/plans/2026-06-30-media-preview-profiling-harness.md`
  - `docs/superpowers/specs/2026-06-30-media-preview-profiling-harness-design.md`

**Interfaces:**
- Produces: `installMediaPreviewProfileHarness(options)` from `src/renderer/performance/mediaPreviewProfileHarness.ts`, already wired in `App.tsx`; `window.__citadelMediaPreviewProfile.run({ gifPath, videoPath, modelPath, timeoutMs })` and `window.__citadelProfileResult` in dev sessions. Task 2 consumes these.

- [x] **Step 1: Run the harness and adjacent tests**

Run: `npm test -- --run src/renderer/performance/mediaPreviewProfile.test.ts src/renderer/performance/mediaPreviewProfileHarness.test.ts src/renderer/performance/largeBoardFixture.test.ts`
Expected: all files PASS.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0, no errors.

- [x] **Step 3: Commit exactly the intended files**

```bash
git add src/renderer/performance/mediaPreviewProfile.ts src/renderer/performance/mediaPreviewProfile.test.ts src/renderer/performance/mediaPreviewProfileHarness.ts src/renderer/performance/mediaPreviewProfileHarness.test.ts src/renderer/App.tsx docs/citadel-performance-roadmap.md docs/citadel-large-chamber-profile-2026-06-30-real-media-sweep-attempt.md docs/superpowers/plans/2026-06-30-media-preview-profiling-harness.md docs/superpowers/specs/2026-06-30-media-preview-profiling-harness-design.md
git commit -m "feat: add dev-only media preview profiling harness"
```

Do NOT `git add .` — `.agents/` and `skills-lock.json` must stay out.

- [x] **Step 4: Merge to master**

```bash
git checkout master
git merge --no-ff codex/media-preview-gates -m "merge: media preview gates and profiling harness"
git push origin master
```

If the user prefers PRs, instead: `git push -u origin codex/media-preview-gates` and open a PR with `gh pr create`. Default to the direct merge unless told otherwise (repo history shows direct commits to master).

---

### Task 2: Run the real-media preview profiling sweep (roadmap queue item 1)

This is the blocking evidence item. It **requires an interactive dev session** — the 2026-06-30 unattended attempt failed at Playwright↔Electron attach (WebSocket 1006, taskkill access denied). Do not fabricate numbers. If the environment cannot drive the Electron window, do not silently park this: give the user the exact steps below (launch command, devtools snippet, what to copy back) and ask them to run it and paste the results; write the profile doc from what they report. Only if that too is unavailable, record another attempt doc and move on — Tasks 3 and 5 do not depend on this, but Task 4's gate does.

**Files:**
- Create: `docs/citadel-large-chamber-profile-2026-07-XX-real-media.md` (use the actual run date)
- Modify: `docs/citadel-performance-roadmap.md` (queue item 1 + profiling notes list + Phase 3 "Remaining")

**Interfaces:**
- Consumes: `window.__citadelMediaPreviewProfile.run(...)` from Task 1.

- [x] **Step 1: Prepare local media inputs** (temporary profiling inputs, not product fixtures — put them in a temp dir, not the repo)

- GIF: copy `node_modules/gifler/site/assets/gif/nyan.gif`
- 3D: a small `.obj` (a hand-written pyramid is fine) — see the 2026-06-30 attempt doc
- Video: any small `.webm` or `.mp4`

- [x] **Step 2: Clear the preview cache for the cold pass**

In the app: Settings → maintenance → "Preview cache" clear, or delete `%APPDATA%/citadel/preview-cache` contents while the app is closed. Record the starting count/bytes (the `cache:previewStats` IPC surfaces this in Settings).

- [x] **Step 3: Launch dev with the profile trigger**

Run: `npm run dev`, then in the opened window navigate/append `#profile-media-preview` (or start a URL containing `profile=media-preview`). Open devtools.

- [x] **Step 4: Cold pass**

```js
await window.__citadelMediaPreviewProfile.run({
  gifPath: 'C:/path/to/sample.gif',
  videoPath: 'C:/path/to/sample.webm',
  modelPath: 'C:/path/to/sample.obj',
  timeoutMs: 9000,
})
```

Record from the result (`window.__citadelProfileResult`): `cacheBefore`, `cacheAfterCold`, `chamberLoad`, `mediaPreviewLoad`, `durationMs`, `notes`. Also note the Chamber Load sigil text, far-zoom pan responsiveness, and any renderer console preview-generation failures.

- [x] **Step 5: Warm pass**

Re-run the same `run(...)` call without clearing the cache. Record `cacheAfterWarm`, `durationMs`, Chamber Load text.

- [x] **Step 6: Write the profile doc**

Create `docs/citadel-large-chamber-profile-2026-07-XX-real-media.md` following the structure of `docs/citadel-large-chamber-profile-2026-06-15-media-previews.md`: purpose, method, cold-pass numbers, warm-pass numbers, interpretation, and an explicit worker-generation verdict (see Task 4 gate).

- [x] **Step 7: Update the roadmap**

In `docs/citadel-performance-roadmap.md`: mark queue item 1 complete (replace it with the next queue head), add the new profile to "Profiling notes", and tick "real-media cold/warm cache profiling" off Phase 3 "Remaining".

- [x] **Step 8: Commit**

```bash
git add docs/citadel-large-chamber-profile-2026-07-XX-real-media.md docs/citadel-performance-roadmap.md
git commit -m "docs: record real-media preview cache profile"
```

---

### Task 3: Progressive text/label detail at far zoom (Phase 3 remaining)

Text and sticky relics currently render full Konva `Text` nodes at every zoom. At far zoom (screen font < ~5px) the glyph layout work is wasted and unreadable. Add a silhouette policy mirroring `previewPolicy.preferThumbnail`: below the threshold, unselected/unedited text relics render a dim rect silhouette instead of laying out text. Palette: silhouettes use existing dim tones already present in these files (`#675f54` region), no new colours.

**Files:**
- Create: `src/renderer/assets/textDetailPolicy.ts`
- Create: `src/renderer/assets/textDetailPolicy.test.ts`
- Modify: `src/renderer/canvas/items/TextItem.tsx`
- Modify: `src/renderer/canvas/items/StickyItem.tsx`
- Modify: `docs/citadel-performance-roadmap.md`

**Interfaces:**
- Produces: `preferTextSilhouette(fontSize: number, viewportScale: number, isSelected: boolean, isEditing: boolean): boolean` and `TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX = 5` from `src/renderer/assets/textDetailPolicy.ts`.
- Consumes: `useCanvasStore((s) => s.viewport().scale)` (the reactive scale pattern already used in `ImageItem.tsx:23`), `useUIStore((s) => s.editingItemId)` (`uiStore.ts:85`).

- [ ] **Step 1: Write the failing test**

Create `src/renderer/assets/textDetailPolicy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { preferTextSilhouette, TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX } from './textDetailPolicy'

describe('preferTextSilhouette', () => {
  it('prefers silhouette when screen font size drops below the threshold', () => {
    expect(preferTextSilhouette(16, 0.1, false, false)).toBe(true) // 1.6px on screen
  })

  it('renders full text at readable screen font sizes', () => {
    expect(preferTextSilhouette(16, 1, false, false)).toBe(false) // 16px on screen
  })

  it('treats the threshold as the first readable size', () => {
    const scale = TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX / 16
    expect(preferTextSilhouette(16, scale, false, false)).toBe(false)
    expect(preferTextSilhouette(16, scale - 0.001, false, false)).toBe(true)
  })

  it('never silhouettes selected relics', () => {
    expect(preferTextSilhouette(16, 0.1, true, false)).toBe(false)
  })

  it('never silhouettes the relic being edited', () => {
    expect(preferTextSilhouette(16, 0.1, false, true)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/renderer/assets/textDetailPolicy.test.ts`
Expected: FAIL — cannot resolve `./textDetailPolicy`.

- [ ] **Step 3: Implement the policy**

Create `src/renderer/assets/textDetailPolicy.ts`:

```ts
export const TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX = 5

// Far-zoom text discipline: below a readable on-screen font size, text relics
// render a dim silhouette instead of laying out Konva glyphs. Selection and
// editing always wake the full text, matching previewPolicy's selection rule.
export function preferTextSilhouette(
  fontSize: number,
  viewportScale: number,
  isSelected: boolean,
  isEditing: boolean,
): boolean {
  if (isSelected || isEditing) return false
  return fontSize * viewportScale < TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/renderer/assets/textDetailPolicy.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire into TextItem**

In `src/renderer/canvas/items/TextItem.tsx`, add imports and the policy check, and short-circuit to a silhouette. Add after the existing store hooks (near `TextItem.tsx:22`):

```ts
import { preferTextSilhouette } from '../../assets/textDetailPolicy'
```

```ts
const scale = useCanvasStore((s) => s.viewport().scale)
const isEditing = useUIStore((s) => s.editingItemId === item.id)
```

Then, after the `const color = ...` line (`TextItem.tsx:40`), insert the early return. The silhouette stays clickable/draggable so far-zoom selection still works — reuse the existing handlers:

```tsx
if (preferTextSilhouette(fontSize, scale, isSelected, isEditing)) {
  return (
    <Rect
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      opacity={item.opacity * 0.6}
      fill="#675f54"
      cornerRadius={2}
      draggable={toolMode === 'select' && !item.locked}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    />
  )
}
```

Note: the early return must come after all hook calls (React rules of hooks) but the handlers are plain consts defined above the JSX, so place the `if` just before the main `return`.

- [ ] **Step 6: Wire into StickyItem**

In `src/renderer/canvas/items/StickyItem.tsx`, add the same two hooks and import. Stickies keep their background `Rect` (it *is* the silhouette) and skip only the glyph work: wrap the body `Text` node (`StickyItem.tsx:223-234`) and the comment-header `Text` (`StickyItem.tsx:210-220`):

```ts
const scale = useCanvasStore((s) => s.viewport().scale)
const isEditing = useUIStore((s) => s.editingItemId === item.id)
const silhouette = preferTextSilhouette(fontSize, scale, isSelected, isEditing)
```

```tsx
{!silhouette && (
  <Text
    x={8} y={textY}
    width={item.width - 16}
    height={textHeight}
    text={content || 'Double-click to edit…'}
    fill={content ? 'var(--text-primary)' : '#675f54'}
    fontSize={fontSize}
    fontStyle={fontStyle}
    fontFamily="var(--font-body)"
    align={align}
    wrap="word"
  />
)}
```

(Apply the same `{!silhouette && ...}` guard to the `COMMENT` header `Text`; leave both `Rect`s untouched so the comment chrome survives far zoom.)

- [ ] **Step 7: Run the item tests and typecheck**

Run: `npm test -- --run src/renderer/assets/textDetailPolicy.test.ts && npm run typecheck`
Expected: PASS / exit 0. Also run the full suite once: `npm test -- --run` — no regressions.

- [ ] **Step 8: Verify in the app**

Run `npm run dev`, create a text relic and a sticky, zoom far out: both degrade to dim blocks; zooming in, selecting, or double-click-editing restores full text. Check with the large-board fixture chamber that far-zoom pan feels no worse.

- [ ] **Step 9: Update the roadmap and commit**

Tick "progressive text/label detail at far zoom" off Phase 3 "Remaining" in `docs/citadel-performance-roadmap.md`.

```bash
git add src/renderer/assets/textDetailPolicy.ts src/renderer/assets/textDetailPolicy.test.ts src/renderer/canvas/items/TextItem.tsx src/renderer/canvas/items/StickyItem.tsx docs/citadel-performance-roadmap.md
git commit -m "feat: silhouette text relics at far zoom"
```

---

### Task 4: Worker-based thumbnail generation — GATED, spec-first

**Gate:** Only do this if the Task 2 profile shows preview generation blocking the renderer (cold-pass jank, long `durationMs` attributable to generation, or Chamber Load degradation during generation). The roadmap's wording is "move generation into a worker once volume justifies it." If the profile is clean, write one line in the profile doc saying the gate is not met, and skip this task.

**Design checkpoint:** If the gate is met, this is a sub-project. Follow the spec-first workflow from Global Constraints: write `docs/superpowers/specs/<date>-thumbnail-worker-design.md`, present it to the user, and wait for approval before writing the plan or any code. Constraints the spec must honour:

- Generation currently lives in `src/renderer/assets/thumbnailPipeline.ts` (`ensureThumbnail`, concurrency-2 queue, content-addressed `thumb-<hash>-<size>-<mtime>.png` in `userData/preview-cache`).
- Keep the pipeline API stable so `ImageItem`/`GifItem`/`VideoItem`/`Model3DItem` callers don't change.
- Worker messages must be typed and cancellable (roadmap Worker Strategy section).
- Failures still record `thumbnailPath: null` and fall back to full source without retry.

---

### Task 5: Phase 5 — Atmospheric Chambers — spec-first

**Design checkpoint:** This is the next feature phase and has no spec yet. Do NOT start implementing from this document. Follow the spec-first workflow from Global Constraints: draft `docs/superpowers/specs/<date>-atmospheric-chambers-design.md`, **present it to the user and wait for explicit approval** — this phase is aesthetic-heavy and judgment-heavy, and the user must sign off on the direction before any code. After approval, write its own plan doc and execute it.

Inputs the spec must reconcile:

- Roadmap Phase 5 goals: board moods → chamber identity, optional chamber ambience, lighting and texture controls, chamber-specific sigil palettes within the dark fantasy theme.
- Existing starting points: `src/renderer/ui/boardMood.ts` (+test), `src/renderer/canvas/CanvasBackground.tsx`, `src/renderer/canvas/effects/` (arcane canvas effects from commits `b593acc`/`605f6e2`/`207e589`).
- Hard constraints: reduced-motion fallback for every ambient animation; no new persistent SVG ornamentation without a large-chamber fixture profile check (roadmap queue items 3–4); CSS-variable colours only; ambience must not wake dormant media or violate the visibility discipline.

---

### Task 6: Housekeeping after each task

Not a separate deliverable — a standing rule: after every task above, `npm test -- --run` and `npm run typecheck` must pass before committing; update `docs/citadel-performance-roadmap.md` whenever a queue item or Phase "Remaining" bullet changes state; keep the "Current Decisions From Recent Sessions" list in that doc appended (never rewritten) when a new durable decision lands.

## Out of Scope (do not start unless asked)

- Normalized store shape (`itemsById` etc.) — roadmap says after virtualization reveals which selectors matter; no evidence yet demands it.
- Long-term features: OCR/PDF text indexing, saved trails, Archive Workbench UI (model exists at `src/renderer/archive/archiveWorkbenchModel.ts`, UI unbuilt), deep media formats (`.kra`, `.psd`, `.blend`...).
- Release packaging (`npm run package`, semver tag) — user-triggered.
