# Asset Health Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Maintenance-panel check for missing local asset files.

**Architecture:** Add a main IPC handler for path existence checks and render the result in `KeybindSettings.tsx`.

**Tech Stack:** Electron IPC, React, TypeScript.

---

### Task 1: Main IPC path checker

**Files:**
- Modify: `src/main/ipc.ts`

- [ ] Add `assets:checkPaths` handler.
- [ ] Return `total`, `missing`, and missing paths.

### Task 2: Maintenance UI

**Files:**
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx`

- [ ] Collect local source paths from current boards.
- [ ] Load asset health when settings opens.
- [ ] Display total and missing count in Maintenance.
- [ ] Refresh asset health with the existing Refresh button.

### Task 3: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

