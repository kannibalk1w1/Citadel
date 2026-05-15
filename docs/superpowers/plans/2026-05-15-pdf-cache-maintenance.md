# PDF Cache Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add settings-panel controls to inspect and clear unused generated PDF preview cache files.

**Architecture:** Electron main owns cache filesystem reads/deletes through IPC. The renderer collects currently referenced canvas item paths and passes them as preserve paths when clearing unused cache files.

**Tech Stack:** Electron IPC, React, TypeScript, Zustand canvas store.

---

### Task 1: Main IPC Cache Utilities

**Files:**
- Modify: `src/main/ipc.ts`

- [ ] Add `readdirSync`, `statSync`, and `unlinkSync` imports from `fs`.
- [ ] Add helper functions for `pdf-cache` directory, stats, and unused-file cleanup.
- [ ] Register `cache:pdfStats` and `cache:clearUnusedPdfPreviews` IPC handlers.

### Task 2: Settings Panel UI

**Files:**
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx`

- [ ] Import `useEffect` and `useCanvasStore`.
- [ ] Add cache stats state and referenced path collection.
- [ ] Load stats when the panel opens.
- [ ] Add a Maintenance section with Refresh and Clear unused controls.

### Task 3: Verification

**Commands:**
- `npm.cmd run build`
- `git diff --check`

Expected: both commands exit 0.

