# Arcane Canvas Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build grounded canvas-origin arcane effects, a broken cobblestone canvas floor, and a consistent toolmark icon system.

**Architecture:** Add a renderer-only canvas effect model/store/layer under `src/renderer/canvas/effects/`, then bridge existing mascot effect events into canvas breach effects so current action handlers keep working. Keep source positioning canvas-first: explicit target point, then last canvas pointer, then visible canvas center. Replace the background SVG generator and toolbar icon registry without changing action names or app data formats.

**Tech Stack:** React + TypeScript, Zustand, CSS/SVG procedural visuals, Vitest.

---

### Task 1: Canvas Effect Model

**Files:**
- Create: `src/renderer/canvas/effects/canvasEffectModel.ts`
- Create: `src/renderer/canvas/effects/canvasEffectModel.test.ts`

- [x] **Step 1: Write failing tests**

Test effect mapping and spawn fallback:

```ts
import { describe, expect, it } from 'vitest'
import { canvasEffectForMascotEffect, resolveCanvasEffectSource } from './canvasEffectModel'

describe('canvasEffectModel', () => {
  it('maps existing action effects to grounded canvas breach effects', () => {
    expect(canvasEffectForMascotEffect('rune-seal')?.kind).toBe('save-blue-flame')
    expect(canvasEffectForMascotEffect('crumble')?.kind).toBe('delete-red-flame')
    expect(canvasEffectForMascotEffect('lightning-in')?.kind).toBe('import-yellow-spark')
    expect(canvasEffectForMascotEffect('lightning-out')?.kind).toBe('export-white-ignition')
  })

  it('prefers target, then last pointer, then visible center for source position', () => {
    const viewport = { x: 20, y: 40, scale: 2 }
    const size = { width: 1000, height: 700 }
    expect(resolveCanvasEffectSource({ target: { x: 12, y: 24 }, lastPointer: { x: 1, y: 2 }, viewport, size })).toEqual({ x: 12, y: 24 })
    expect(resolveCanvasEffectSource({ lastPointer: { x: 1, y: 2 }, viewport, size })).toEqual({ x: 1, y: 2 })
    expect(resolveCanvasEffectSource({ viewport, size })).toEqual({ x: 240, y: 155 })
  })
})
```

- [x] **Step 2: Run RED**

Run: `npm test -- --run src/renderer/canvas/effects/canvasEffectModel.test.ts`

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement model**

Create typed effect definitions:

```ts
export type CanvasEffectKind =
  | 'save-blue-flame'
  | 'autosave-blue-pulse'
  | 'delete-red-flame'
  | 'import-yellow-spark'
  | 'export-white-ignition'
  | 'undo-ash-reverse'
  | 'redo-ember-surge'
  | 'error-red-fracture'
  | 'recording-red-eye'
  | 'sigil-grey-flare'
  | 'reduced-pulse'
```

Implement mappings, colors, lifetimes, and `resolveCanvasEffectSource`.

- [x] **Step 4: Run GREEN**

Run: `npm test -- --run src/renderer/canvas/effects/canvasEffectModel.test.ts`

Expected: PASS.

### Task 2: Canvas Effect Store And Layer

**Files:**
- Create: `src/renderer/canvas/effects/canvasEffectStore.ts`
- Create: `src/renderer/canvas/effects/CanvasEffectLayer.tsx`
- Modify: `src/renderer/canvas/CanvasStage.tsx`
- Modify: `src/renderer/store/mascotStore.ts`

- [x] **Step 1: Write failing store tests**

Add tests for enqueue, last pointer, reduced-motion mapping, and pruning.

- [x] **Step 2: Run RED**

Run: `npm test -- --run src/renderer/canvas/effects/canvasEffectStore.test.ts`

Expected: FAIL until the store exists.

- [x] **Step 3: Implement store**

Use Zustand for `activeEffects`, `lastCanvasPointer`, `triggerCanvasEffect`, `setLastCanvasPointer`, and `clearCanvasEffect`.

- [x] **Step 4: Implement layer**

Render absolute positioned flame/spark/fracture clusters from active effects using CSS keyframes and inline CSS variables. Keep `pointerEvents: 'none'`.

- [x] **Step 5: Wire layer**

Render `<CanvasEffectLayer viewport={viewport} width={width} height={height} />` immediately after `<CanvasBackground />`. Update canvas mouse movement to store last canvas pointer.

- [x] **Step 6: Bridge mascot effects**

In `mascotStore.triggerEffect`, enqueue matching canvas effects via `canvasEffectForMascotEffect`. Keep reduced-motion fallback.

- [x] **Step 7: Run tests**

Run: `npm test -- --run src/renderer/canvas/effects/canvasEffectModel.test.ts src/renderer/canvas/effects/canvasEffectStore.test.ts src/renderer/canvas/CanvasStage.test.tsx`

Expected: PASS.

### Task 3: Broken Cobblestone Background

**Files:**
- Modify: `src/renderer/canvas/CanvasBackground.tsx`
- Create: `src/renderer/canvas/CanvasBackground.test.ts`

- [x] **Step 1: Write failing tests**

Extract the SVG builder and test that snap mode changes mortar/highlight detail while both outputs contain crack paths.

- [x] **Step 2: Run RED**

Run: `npm test -- --run src/renderer/canvas/CanvasBackground.test.ts`

Expected: FAIL before exports exist.

- [x] **Step 3: Implement background generator**

Generate larger irregular slabs, dark mortar, chips, and crack paths. Keep existing settings and viewport positioning.

- [x] **Step 4: Run GREEN**

Run: `npm test -- --run src/renderer/canvas/CanvasBackground.test.ts`

Expected: PASS.

### Task 4: Toolmark Icon System

**Files:**
- Create: `src/renderer/ui/icons/ToolIcon.tsx`
- Create: `src/renderer/ui/icons/ToolIcon.test.tsx`
- Modify: `src/renderer/ui/Toolbar.tsx`

- [x] **Step 1: Write failing registry tests**

Test that the registry includes all toolbar icons and renders monochrome currentColor SVGs.

- [x] **Step 2: Run RED**

Run: `npm test -- --run src/renderer/ui/icons/ToolIcon.test.tsx`

Expected: FAIL because `ToolIcon` does not exist.

- [x] **Step 3: Implement icon registry**

Create a consistent stroked icon family with `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`, and shared stroke props.

- [x] **Step 4: Replace toolbar icons**

Use `ToolIcon` for the main toolbar, YouTube/media, snap, auto-arrange, record, voice, presentation, and theme controls.

- [x] **Step 5: Run GREEN**

Run: `npm test -- --run src/renderer/ui/icons/ToolIcon.test.tsx src/renderer/canvas/CanvasStage.test.tsx`

Expected: PASS.

### Task 5: Verification And Commit

**Files:**
- All changed files.

- [x] **Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [x] **Step 2: Run full tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [x] **Step 3: Run build**

Run: `npm run build`

Expected: exit 0. Existing Vite chunk warnings may remain.

- [x] **Step 4: Commit and push**

Commit message: `feat: add arcane canvas effects`
