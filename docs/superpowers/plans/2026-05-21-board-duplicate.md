# Board Duplicate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an active-board duplicate workflow.

**Architecture:** Implement cloning in `canvasStore`, expose it through `Actions`, keybinds, native menu, resolver, and right sidebar.

**Tech Stack:** Zustand, Electron menu IPC, React, TypeScript.

---

### Task 1: Store board clone

**Files:**
- Modify: `src/renderer/store/canvasStore.ts`

- [ ] Add `duplicateBoard(id)`.
- [ ] Deep-copy items/connections and remap ids.

### Task 2: Action wiring

**Files:**
- Modify: `src/renderer/keybinds/actions.ts`
- Modify: `src/renderer/keybinds/defaultKeybinds.ts`
- Modify: `src/main/menu.ts`
- Modify: `src/renderer/App.tsx`

- [ ] Add action and `Ctrl+Shift+D` default keybind.
- [ ] Add native Board menu item and renderer listener.
- [ ] Register resolver handler.

### Task 3: Visible UI

**Files:**
- Modify: `src/renderer/ui/RightSidebar.tsx`

- [ ] Add Clone board quick action.

### Task 4: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

