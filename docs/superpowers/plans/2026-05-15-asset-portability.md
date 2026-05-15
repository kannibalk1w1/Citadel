# Asset Portability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `.citadel` saves and `.citadelz` archives portable by copying local assets and rewriting project asset paths.

**Architecture:** Keep filesystem operations in `src/main/ipc.ts`. Add main-process helpers to rewrite `CanvasItem.src` paths for save/load/export/import, while the renderer continues using the existing IPC channels.

**Tech Stack:** Electron IPC, Node `fs`/`path`, JSZip, React renderer project utilities.

---

### Task 1: Main-process asset path helpers

**Files:**
- Modify: `src/main/ipc.ts`

- [ ] Add path and fs imports for copy, relative path checks, and extension detection.
- [ ] Add helpers that detect URL-like sources, create unique asset names, copy files into `assets/`, and walk project boards/items.

### Task 2: Portable `.citadel` save/load

**Files:**
- Modify: `src/main/ipc.ts`

- [ ] Update `file:save` to parse JSON, copy external local assets into sibling `assets/`, rewrite item `src` paths to project-relative values, then write JSON.
- [ ] Update `file:load` to parse JSON and resolve relative item `src` paths against the project file folder before returning data.

### Task 3: Portable `.citadelz` export/import

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/renderer/utils/projectFile.ts`

- [ ] Update `export:zip` so project JSON inside the archive uses bundled `assets/...` paths.
- [ ] Update `import:zip` so returned project JSON resolves bundled asset paths to extracted files.
- [ ] Update `openProject()` to call `import:zip` when the selected path ends in `.citadelz`.

### Task 4: Verification

**Commands:**
- `npm.cmd run build`
- `git diff --check`

Expected: both commands exit 0.

