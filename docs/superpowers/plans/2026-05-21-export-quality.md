# Export Quality Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted export scale setting used by image and PDF export.

**Architecture:** Store export scale in `uiStore`, load it from settings during app startup, surface it in the settings panel, and apply it through offscreen canvas scaling in export modules.

**Tech Stack:** React, TypeScript, Canvas 2D, Electron IPC settings.

---

### Task 1: Store and startup load

**Files:**
- Modify: `src/renderer/store/uiStore.ts`
- Modify: `src/renderer/App.tsx`

- [ ] Add `exportScale` and `setExportScale`.
- [ ] Persist `export.scale`.
- [ ] Load `export.scale` during startup.

### Task 2: Settings UI

**Files:**
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx`

- [ ] Add an Export section with 1x/2x/3x controls.
- [ ] Wire controls to `setExportScale`.

### Task 3: Export scaling

**Files:**
- Modify: `src/renderer/export/imageExport.ts`
- Modify: `src/renderer/export/pdfExport.ts`

- [ ] Render the current canvas into an offscreen canvas at selected scale.
- [ ] Use scaled data URLs for image and PDF export.

### Task 4: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

