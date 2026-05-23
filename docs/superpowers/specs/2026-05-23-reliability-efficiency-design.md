# Citadel Reliability and Efficiency Design

## Goal

Improve Citadel's reliability around unsaved work while reducing avoidable work in startup, autosave, settings persistence, and common canvas interactions.

This is a targeted pass. It should make the app safer and snappier without changing the visible workflow, replacing the current Zustand architecture, or introducing high-risk rendering changes.

## Scope

In scope:

- Dirty-aware recovery autosave.
- Duplicate recovery write avoidance.
- More intentional recovery clearing.
- Batched settings IPC for startup and grouped preference writes.
- Small canvas-store helpers for common selected-item and sorted-item queries.
- Memoized sorted item rendering in `CanvasStage`.
- Focused unit tests for new pure logic and IPC behavior.

Out of scope:

- Canvas virtualization or viewport culling.
- Worker-thread project serialization.
- A new normalized canvas-store architecture.
- Changes to the `.citadel` or `.citadelz` file format.
- New user-facing settings panels beyond wiring existing settings more efficiently.

## Reliability Behavior

Autosave should only write a recovery snapshot when there are unsaved project changes. A clean project should not serialize or touch the recovery file on the timer. This reduces disk churn and makes the recovery file more meaningful: if it exists, it represents work that may need attention.

When the project is dirty, autosave should create the same recovery snapshot shape used today, but it should avoid writing if the serialized recovery payload is identical to the last successful recovery payload. This keeps periodic autosave from rewriting unchanged data if the dirty state has not changed since the previous recovery pass.

Recovery clearing should be intentional:

- Restoring recovery clears the recovery file after the project data is applied.
- Dismissing recovery clears the recovery file.
- Clean unload may clear recovery only if the history store reports no unsaved changes.
- Dirty unload should leave recovery intact.

Manual save should keep its current behavior: save through IPC, mark the history cursor saved, update save activity, remember the recent project, and trigger existing UI effects from callers.

The existing unsaved-change guard for New/Open/Recent remains in place. The implementation should keep these methods returning success booleans so callers only trigger mascot effects after actual project replacement.

## Settings IPC

Add main-process handlers:

- `settings:getMany` accepts `{ keys: string[] }` and returns `{ values: Record<string, unknown> }`.
- `settings:setMany` accepts `{ values: Record<string, unknown> }` and returns `{ ok: true }`.

Existing `settings:get` and `settings:set` stay unchanged for compatibility.

Startup should replace the current chain of individual settings reads with one `settings:getMany` call covering:

- `ui.youSavedEnabled`
- `ui.hyperTypeEnabled`
- `ui.dragonCursorEnabled`
- `ui.zoomFactor`
- `export.scale`
- `export.area`
- `export.includeComments`
- `ui.canvasBackground`

Export preset application should persist `export.area`, `export.scale`, and `export.includeComments` through one `settings:setMany` call. Existing individual setters can keep using `settings:set` unless they naturally write multiple keys at once.

The batched handlers should read and write the same `settings.json` file as the current handlers. They should validate that keys are strings and should ignore malformed entries rather than throwing from ordinary UI mistakes.

## Canvas Efficiency

Add narrowly scoped helpers to the canvas store or a colocated pure helper module:

- Get active-board items sorted by `zIndex`.
- Get selected active-board items.
- Get selected unlocked active-board items.
- Optionally build an active-board `Map<string, CanvasItem>` when a caller needs repeated id lookup.

Use these helpers to remove repeated patterns such as:

```ts
items().filter((item) => selectedIds.includes(item.id) && !item.locked)
```

The helpers should use `Set` membership for selected ids so multi-selection work scales better on dense boards.

`CanvasStage` should stop sorting inline during JSX rendering. It should derive sorted items with `useMemo` from the active item array:

```ts
const sortedItems = useMemo(() => [...items].sort((a, b) => a.zIndex - b.zIndex), [items])
```

This preserves rendering behavior while avoiding repeated allocation and sorting for renders caused by viewport, cursor, or overlay state.

This pass should not change drag, snap, lasso, DOM item, SVG connection, or Konva layering behavior.

## Data Flow

Autosave flow:

1. Timer fires.
2. Renderer checks `historyStore.isDirty()`.
3. If clean, skip without triggering a recovery write or autosave mascot effect.
4. If dirty, create the recovery snapshot.
5. If the serialized payload equals the last successful recovery payload, skip the IPC write.
6. Otherwise call `file:saveRecovery`.
7. On success, update recovery save activity.

Settings startup flow:

1. App startup calls `settings:getMany`.
2. Renderer validates each returned value.
3. Renderer applies valid settings through existing UI-store setters or direct state updates where calling a setter would rewrite the same value unnecessarily.
4. HyperType engine state stays synchronized with `ui.hyperTypeEnabled`.

Canvas action flow:

1. Action handlers ask the store/helper for selected or selected-unlocked items.
2. Handlers push the same history events as today.
3. Store mutations stay unchanged unless a helper reveals an obvious batch-safe simplification.

## Error Handling

Autosave remains non-critical. Recovery write failures should be caught and should not interrupt editing. Failed writes should not update the last recovery payload cache.

Settings batching should be tolerant:

- Missing settings return `null` or are omitted consistently.
- Malformed `keys` or `values` inputs return safe empty/default results.
- Existing single-key handlers remain available if a caller still uses them.

Canvas helpers should return empty arrays when there is no active board or no matching selection.

## Testing

Add or update tests for:

- Autosave skips when clean.
- Autosave writes when dirty.
- Autosave avoids duplicate recovery writes after an unchanged successful snapshot.
- Dirty unload does not clear recovery, while clean unload can.
- `settings:getMany` and `settings:setMany` preserve current settings semantics.
- Canvas selection helpers return selected and selected-unlocked items correctly.
- Sorted active-board items are ordered by `zIndex`.

Run:

```bash
npm.cmd run build
npm run typecheck
npm test -- --run
git diff --check
```

## Acceptance Criteria

- Dirty projects continue to produce recovery snapshots.
- Clean projects do not perform periodic recovery writes.
- Recovery is not cleared on dirty unload.
- Startup settings load uses one batched IPC read.
- Export preset persistence uses one batched IPC write.
- Common selected-item actions use helper logic with `Set` membership rather than repeated `includes` scans.
- `CanvasStage` no longer sorts items inline in JSX.
- Existing save/open/new/export behavior remains visible-compatible.
- Verification commands pass.
