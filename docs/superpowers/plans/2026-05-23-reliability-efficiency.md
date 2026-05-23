# Reliability and Efficiency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Citadel's recovery autosave safer and less wasteful, batch settings IPC, and reduce avoidable canvas item scans/sorts.

**Architecture:** Keep the current Electron, React, and Zustand architecture. Add small testable helpers where logic is currently embedded in components, preserve existing IPC channels, and add batched channels alongside them. Optimize only known hot paths: recovery writes, settings startup/preset writes, selected-item lookup, and active-board z-order rendering.

**Tech Stack:** Electron IPC, React + TypeScript, Zustand, Vitest.

---

## File Structure

- Modify `src/renderer/utils/projectFile.ts`: add recovery autosave result reporting, dirty checks, duplicate payload skipping, and clean-unload recovery clearing helper.
- Create `src/renderer/utils/projectFile.test.ts`: test autosave skip/write/deduplicate behavior.
- Modify `src/main/ipc.ts`: add `settings:getMany` and `settings:setMany`.
- Create `src/main/settingsStore.ts`: isolate settings read/write/get/set helpers for pure testing and IPC reuse.
- Create `src/main/settingsStore.test.ts`: test batched settings semantics.
- Modify `src/renderer/store/uiStore.ts`: make export presets persist with `settings:setMany`.
- Modify `src/renderer/store/uiStore.test.ts`: update export preset expectation.
- Modify `src/renderer/store/canvasStore.ts`: add selected-item and sorted-item helpers.
- Modify `src/renderer/store/canvasStore.test.ts`: test helpers.
- Modify `src/renderer/canvas/CanvasStage.tsx`: memoize sorted items.
- Modify `src/renderer/App.tsx`: batch startup settings load, call clean-unload recovery helper, and trigger autosave mascot only when a recovery write happened.

## Task 1: Recovery Autosave Logic

**Files:**
- Modify: `src/renderer/utils/projectFile.ts`
- Create: `src/renderer/utils/projectFile.test.ts`

- [ ] **Step 1: Write failing autosave tests**

Add tests that mock `window.ipc.invoke`, reset stores, and verify:

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { autoSave, clearRecoveryIfClean, resetRecoveryAutosaveCacheForTests } from './projectFile'

const mockInvoke = vi.fn().mockResolvedValue({ ok: true })

beforeEach(() => {
  Object.assign(window, { ipc: { invoke: mockInvoke } })
  mockInvoke.mockClear()
  resetRecoveryAutosaveCacheForTests()
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Board 1',
      items: [],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useHistoryStore.setState({
    events: [],
    cursor: -1,
    savedCursor: -1,
    recordingSession: null,
    isRecording: false,
    recordings: [],
  })
})

describe('projectFile autosave recovery', () => {
  it('skips recovery writes when the project is clean', async () => {
    useHistoryStore.getState().markSaved()

    await expect(autoSave()).resolves.toBe('skipped-clean')

    expect(mockInvoke).not.toHaveBeenCalledWith('file:saveRecovery', expect.anything())
  })

  it('writes recovery when the project is dirty', async () => {
    useHistoryStore.getState().markDirty()

    await expect(autoSave()).resolves.toBe('saved')

    expect(mockInvoke).toHaveBeenCalledWith('file:saveRecovery', {
      data: expect.stringContaining('"kind": "citadel-recovery"'),
    })
  })

  it('skips duplicate recovery payloads after a successful write', async () => {
    useHistoryStore.getState().markDirty()

    await expect(autoSave()).resolves.toBe('saved')
    await expect(autoSave()).resolves.toBe('skipped-unchanged')

    expect(mockInvoke.mock.calls.filter(([channel]) => channel === 'file:saveRecovery')).toHaveLength(1)
  })

  it('clears recovery only when the project is clean', async () => {
    useHistoryStore.getState().markDirty()
    await expect(clearRecoveryIfClean()).resolves.toBe(false)

    useHistoryStore.getState().markSaved()
    await expect(clearRecoveryIfClean()).resolves.toBe(true)

    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(mockInvoke).toHaveBeenCalledWith('recovery:clear')
  })
})
```

- [ ] **Step 2: Run autosave tests and confirm failure**

Run: `npm test -- --run src/renderer/utils/projectFile.test.ts`

Expected: FAIL because `clearRecoveryIfClean` and `resetRecoveryAutosaveCacheForTests` do not exist and `autoSave()` returns `void`.

- [ ] **Step 3: Implement recovery autosave behavior**

In `projectFile.ts`:

```ts
export type AutoSaveResult = 'saved' | 'skipped-clean' | 'skipped-unchanged' | 'failed'

let lastRecoveryPayload: string | null = null

export function resetRecoveryAutosaveCacheForTests(): void {
  lastRecoveryPayload = null
}

export async function clearRecoveryIfClean(): Promise<boolean> {
  if (useHistoryStore.getState().isDirty()) return false
  try {
    await ipc().invoke('recovery:clear')
    return true
  } catch {
    return false
  }
}

export async function autoSave(): Promise<AutoSaveResult> {
  if (!useHistoryStore.getState().isDirty()) return 'skipped-clean'
  const payload = JSON.stringify(createRecoverySnapshot(), null, 2)
  if (payload === lastRecoveryPayload) return 'skipped-unchanged'
  try {
    await ipc().invoke('file:saveRecovery', { data: payload })
    lastRecoveryPayload = payload
    setSaveActivity({ lastRecoverySaveAt: Date.now() })
    return 'saved'
  } catch {
    return 'failed'
  }
}
```

Reset `lastRecoveryPayload` in project replacement paths that apply, load, save, or create projects.

- [ ] **Step 4: Run autosave tests and confirm pass**

Run: `npm test -- --run src/renderer/utils/projectFile.test.ts`

Expected: PASS.

## Task 2: Batched Settings Helpers and IPC

**Files:**
- Create: `src/main/settingsStore.ts`
- Create: `src/main/settingsStore.test.ts`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Write failing settings store tests**

Create tests for in-memory helper behavior:

```ts
import { describe, expect, it } from 'vitest'
import { getManySettings, setManySettings } from './settingsStore'

describe('settingsStore batch helpers', () => {
  it('gets many values and returns null for missing keys', () => {
    expect(getManySettings({ a: 1, b: false }, ['a', 'b', 'c'])).toEqual({
      a: 1,
      b: false,
      c: null,
    })
  })

  it('ignores non-string keys when getting many values', () => {
    expect(getManySettings({ a: 1 }, ['a', 42 as unknown as string])).toEqual({ a: 1 })
  })

  it('sets many values without dropping existing settings', () => {
    expect(setManySettings({ a: 1 }, { b: 2, c: false })).toEqual({
      a: 1,
      b: 2,
      c: false,
    })
  })
})
```

- [ ] **Step 2: Run settings tests and confirm failure**

Run: `npm test -- --run src/main/settingsStore.test.ts`

Expected: FAIL because `settingsStore.ts` does not exist.

- [ ] **Step 3: Implement settings helpers**

Create `settingsStore.ts` with:

```ts
import { readFileSync, writeFileSync } from 'fs'

export function readSettingsFile(settingsPath: string): Record<string, unknown> {
  try { return JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch { return {} }
}

export function writeSettingsFile(settingsPath: string, data: Record<string, unknown>): void {
  writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}

export function getManySettings(settings: Record<string, unknown>, keys: unknown[]): Record<string, unknown> {
  return keys.reduce<Record<string, unknown>>((acc, key) => {
    if (typeof key === 'string') acc[key] = settings[key] ?? null
    return acc
  }, {})
}

export function setManySettings(settings: Record<string, unknown>, values: unknown): Record<string, unknown> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return settings
  return Object.entries(values as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, { ...settings })
}
```

- [ ] **Step 4: Wire IPC handlers**

Update `ipc.ts` to import these helpers, replace local settings read/write functions with wrappers around `readSettingsFile` and `writeSettingsFile`, and add:

```ts
ipcMain.handle('settings:getMany', async (_e, { keys }: { keys: unknown[] }) => {
  const settings = readSettings()
  return { values: getManySettings(settings, Array.isArray(keys) ? keys : []) }
})

ipcMain.handle('settings:setMany', async (_e, { values }: { values: unknown }) => {
  const settings = setManySettings(readSettings(), values)
  writeSettings(settings)
  return { ok: true }
})
```

- [ ] **Step 5: Run settings tests and confirm pass**

Run: `npm test -- --run src/main/settingsStore.test.ts`

Expected: PASS.

## Task 3: Renderer Settings Batching

**Files:**
- Modify: `src/renderer/store/uiStore.ts`
- Modify: `src/renderer/store/uiStore.test.ts`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update preset test expectation**

In `uiStore.test.ts`, change the export preset test to expect one batched call:

```ts
expect(mockInvoke).toHaveBeenCalledWith('settings:setMany', {
  values: {
    'export.area': 'board',
    'export.scale': 2,
    'export.includeComments': false,
  },
})
```

- [ ] **Step 2: Run UI store tests and confirm failure**

Run: `npm test -- --run src/renderer/store/uiStore.test.ts`

Expected: FAIL because `applyExportPreset` still calls three `settings:set` writes.

- [ ] **Step 3: Implement preset batch write**

Update `applyExportPreset` in `uiStore.ts` to call `settings:setMany` once with the three export keys.

- [ ] **Step 4: Batch startup settings load**

In `App.tsx`, replace individual startup `settings:get` calls for UI/export/canvas settings with a single `settings:getMany` call. Apply values with direct `useUIStore.setState` where calling a setter would rewrite the value, and call `engine.setEnabled(true)` when hypertype is enabled.

- [ ] **Step 5: Run UI store tests**

Run: `npm test -- --run src/renderer/store/uiStore.test.ts`

Expected: PASS.

## Task 4: Canvas Store Helpers and Render Memo

**Files:**
- Modify: `src/renderer/store/canvasStore.ts`
- Modify: `src/renderer/store/canvasStore.test.ts`
- Modify: `src/renderer/canvas/CanvasStage.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Write failing canvas helper tests**

Add tests that create three items with mixed selection, lock state, and z-index, then expect:

```ts
expect(useCanvasStore.getState().selectedItems().map((item) => item.id)).toEqual(['item-1', 'item-3'])
expect(useCanvasStore.getState().selectedUnlockedItems().map((item) => item.id)).toEqual(['item-1'])
expect(useCanvasStore.getState().sortedItems().map((item) => item.id)).toEqual(['item-2', 'item-1', 'item-3'])
```

- [ ] **Step 2: Run canvas store tests and confirm failure**

Run: `npm test -- --run src/renderer/store/canvasStore.test.ts`

Expected: FAIL because the helper methods do not exist.

- [ ] **Step 3: Implement canvas helpers**

Extend `CanvasState` and store implementation:

```ts
selectedItems: () => CanvasItem[]
selectedUnlockedItems: () => CanvasItem[]
sortedItems: () => CanvasItem[]
```

Use `new Set(get().selectedIds)` inside selected helpers and return sorted copies from `sortedItems`.

- [ ] **Step 4: Use helpers in hot action handlers**

Replace straightforward repeated selected scans in `App.tsx` for delete, duplicate, lock toggle, group, cut/copy/paste-related selection reads, align, and auto-arrange with `selectedItems()` or `selectedUnlockedItems()`.

- [ ] **Step 5: Memoize CanvasStage sorted render list**

Import `useMemo` from React and add:

```ts
const sortedItems = useMemo(() => [...items].sort((a, b) => a.zIndex - b.zIndex), [items])
```

Render `sortedItems.map(...)` instead of sorting inline.

- [ ] **Step 6: Run canvas store tests**

Run: `npm test -- --run src/renderer/store/canvasStore.test.ts`

Expected: PASS.

## Task 5: App Recovery Integration

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update clean unload handling**

Import `clearRecoveryIfClean` from `projectFile.ts` and use it in the `beforeunload` handler instead of invoking `recovery:clear` unconditionally.

- [ ] **Step 2: Update autosave mascot trigger**

Change the autosave interval to:

```ts
autoSave().then((result) => {
  if (result === 'saved') triggerEffect('base-pulse')
})
```

Catch failures with `.catch(() => {})` or rely on `autoSave()` returning `'failed'`.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- --run src/renderer/utils/projectFile.test.ts src/renderer/store/uiStore.test.ts src/renderer/store/canvasStore.test.ts src/main/settingsStore.test.ts
```

Expected: PASS.

## Task 6: Full Verification and Commit

**Files:**
- All modified files.

- [ ] **Step 1: Run production build**

Run: `npm.cmd run build`

Expected: exit 0.

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Run full Vitest suite**

Run: `npm test -- --run`

Expected: exit 0.

- [ ] **Step 4: Run whitespace check**

Run: `git diff --check`

Expected: exit 0.

- [ ] **Step 5: Review diff**

Run: `git diff --stat` and `git diff -- src/renderer/utils/projectFile.ts src/main/ipc.ts src/main/settingsStore.ts src/renderer/store/uiStore.ts src/renderer/store/canvasStore.ts src/renderer/canvas/CanvasStage.tsx src/renderer/App.tsx`

Expected: changes match the design and do not include unrelated files.

- [ ] **Step 6: Commit implementation**

Run:

```bash
git add src/renderer/utils/projectFile.ts src/renderer/utils/projectFile.test.ts src/main/ipc.ts src/main/settingsStore.ts src/main/settingsStore.test.ts src/renderer/store/uiStore.ts src/renderer/store/uiStore.test.ts src/renderer/store/canvasStore.ts src/renderer/store/canvasStore.test.ts src/renderer/canvas/CanvasStage.tsx src/renderer/App.tsx docs/superpowers/plans/2026-05-23-reliability-efficiency.md
git commit -m "feat: improve reliability and efficiency"
```

Expected: commit succeeds.
