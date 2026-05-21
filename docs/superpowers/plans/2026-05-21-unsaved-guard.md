# Unsaved Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add confirmation before New/Open/Recent replace dirty project state.

**Architecture:** Implement the guard in `projectFile.ts`; adjust callers in `App.tsx` to respect the boolean return value.

**Tech Stack:** React, TypeScript, Zustand.

---

### Task 1: Guard project replacement

**Files:**
- Modify: `src/renderer/utils/projectFile.ts`

- [ ] Add `confirmDiscardUnsaved()`.
- [ ] Call it before `openProject`, `openRecentProject`, and `newProject`.
- [ ] Make `newProject()` return `boolean`.

### Task 2: Caller behavior

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] Trigger New Project effect only if `newProject()` returns true.

### Task 3: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

