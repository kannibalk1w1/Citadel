# Save Activity Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display last manual save and recovery autosave timestamps in the sidebar.

**Architecture:** Track save activity in `projectFile.ts`; listen and display in `RightSidebar.tsx`.

**Tech Stack:** React, TypeScript, Electron IPC.

---

### Task 1: Save activity state

**Files:**
- Modify: `src/renderer/utils/projectFile.ts`

- [ ] Add save activity state and getter.
- [ ] Update state after save/autosave.
- [ ] Clear state when project context changes.

### Task 2: Sidebar display

**Files:**
- Modify: `src/renderer/ui/RightSidebar.tsx`

- [ ] Listen for save activity events.
- [ ] Render last manual save and autosave times in the status strip.

### Task 3: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

