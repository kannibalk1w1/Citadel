# Relink Missing Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a folder-based relink workflow for missing local item assets.

**Architecture:** Add a main-process recursive folder scanner and replacement mapper; update item `src` values in the renderer after successful matches.

**Tech Stack:** Electron IPC, React, TypeScript, Zustand canvas/history stores.

---

### Task 1: Main IPC relink handler

**Files:**
- Modify: `src/main/ipc.ts`

- [ ] Add recursive folder scan helper.
- [ ] Add `assets:relinkMissing` handler that opens a directory picker.
- [ ] Return `{ replacements, scanned }`.

### Task 2: Maintenance relink UI

**Files:**
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx`

- [ ] Add relink state/message.
- [ ] Call `assets:relinkMissing` with current missing paths.
- [ ] Apply returned replacements to matching canvas items.
- [ ] Mark project dirty and refresh health.

### Task 3: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

