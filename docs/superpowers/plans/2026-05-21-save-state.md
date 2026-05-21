# Save State Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add saved/unsaved state tracking and a sidebar status indicator.

**Architecture:** Add dirty-state primitives to `historyStore`, wire project lifecycle calls in `projectFile.ts`, and show the result in `RightSidebar.tsx`.

**Tech Stack:** Zustand, React, TypeScript.

---

### Task 1: History saved cursor

**Files:**
- Modify: `src/renderer/store/historyStore.ts`

- [ ] Add `savedCursor`, `markSaved`, `resetHistory`, and `isDirty`.

### Task 2: Project lifecycle wiring

**Files:**
- Modify: `src/renderer/utils/projectFile.ts`

- [ ] Mark saved after successful save.
- [ ] Reset history after open/new/recovery load.
- [ ] Dispatch a project path changed event.

### Task 3: Sidebar status

**Files:**
- Modify: `src/renderer/ui/RightSidebar.tsx`

- [ ] Read `isDirty`.
- [ ] Show current project name and saved/unsaved status.

### Task 4: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

