# Citadel Shell Recomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Recompose Citadel from scattered floating chrome into a three-layer workbench shell: command spine, canvas stage, and archive rail/context deck.

**Architecture:** Add small shell model and frame components under `src/renderer/ui/shell/`, then migrate `App.tsx` to render through those slots while preserving all existing feature components and keybind behavior. Keep the first build as structural and visual: no new state store, no routing changes, no action renames.

**Tech Stack:** React + TypeScript, CSS variables, existing Zustand stores, Vitest for shell model tests.

---

### Task 1: Shell Model

**Files:**
- Create: `src/renderer/ui/shell/shellModel.ts`
- Create: `src/renderer/ui/shell/shellModel.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { archiveRailSections, commandSpineSections, shellCanvasInset } from './shellModel'

describe('shellModel', () => {
  it('groups command spine actions by work mode', () => {
    expect(commandSpineSections.map((section) => section.id)).toEqual(['select', 'create', 'media', 'system'])
    expect(commandSpineSections.flatMap((section) => section.items).map((item) => item.id)).toContain('presentation')
  })

  it('groups archive rail actions into project, mark, and output areas', () => {
    expect(archiveRailSections.map((section) => section.id)).toEqual(['project', 'mark', 'output'])
    expect(archiveRailSections.find((section) => section.id === 'project')?.items.map((item) => item.id)).toEqual([
      'import',
      'boards',
      'assets',
      'new-board',
      'clone-board',
    ])
  })

  it('keeps the canvas inset tied to the shell rail width', () => {
    expect(shellCanvasInset(false)).toBe('var(--archive-rail-w)')
    expect(shellCanvasInset(true)).toBe('0px')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/renderer/ui/shell/shellModel.test.ts`

Expected: FAIL because `shellModel.ts` does not exist.

- [x] **Step 3: Implement shell model**

```ts
export type ShellActionId =
  | 'select' | 'pan' | 'lasso' | 'connect'
  | 'text' | 'sticky' | 'link' | 'swatch' | 'tag' | 'comparison'
  | 'youtube' | 'snap' | 'auto-arrange' | 'record' | 'voice' | 'presentation' | 'theme'
  | 'import' | 'boards' | 'assets' | 'new-board' | 'clone-board'
  | 'comment' | 'notes' | 'sequence'
  | 'export-pdf' | 'export-png' | 'export-zip'

export type ShellSection = {
  id: string
  title: string
  items: { id: ShellActionId; label: string }[]
}

export const commandSpineSections: ShellSection[] = [...]
export const archiveRailSections: ShellSection[] = [...]
export function shellCanvasInset(presentationMode: boolean): string { ... }
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/renderer/ui/shell/shellModel.test.ts`

Expected: PASS.

### Task 2: Shell Frame

**Files:**
- Create: `src/renderer/ui/shell/ShellFrame.tsx`
- Modify: `src/renderer/App.tsx`

- [x] **Step 1: Create shell frame component**

`ShellFrame` accepts slot props: `topBar`, `commandSpine`, `canvas`, `archiveRail`, `contextDeck`, `globalOverlays`, and `presentationOverlay`.

- [x] **Step 2: Migrate App render tree**

Move the existing board tabs, toolbar, canvas container, right sidebar, panels, and overlays into `ShellFrame` slots without changing behavior.

- [x] **Step 3: Run existing App and canvas tests**

Run: `npm test -- --run src/renderer/canvas/CanvasStage.test.tsx src/renderer/ui/TagSearch.test.tsx`

Expected: PASS.

### Task 3: Visual Shell Recomposition

**Files:**
- Modify: `src/renderer/theme/dark.css`
- Modify: `src/renderer/theme/gothicChrome.css`
- Modify: `src/renderer/ui/Toolbar.tsx`
- Modify: `src/renderer/ui/RightSidebar.tsx`

- [x] **Step 1: Shift palette from aged gold to obsidian and moonlit metal**

Use a colder accent, keep danger red, preserve mascot effect colors.

- [x] **Step 2: Restyle command spine**

Add shell-specific classes around toolbar groups, replacing the single-button column feel with grouped command spine zones.

- [x] **Step 3: Restyle archive rail**

Make right rail read as project/status rail with sections and a wider, calmer hierarchy.

- [x] **Step 4: Verify build**

Run: `npm run typecheck`, `npm test -- --run`, `npm run build`.

Expected: all exit 0. Existing Three.js chunk warnings may remain.
