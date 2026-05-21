# Recovery Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve crash recovery by adding snapshot metadata, legacy compatibility, and normal-exit cleanup.

**Architecture:** Keep recovery I/O in main IPC. Add renderer-side snapshot wrapping in `projectFile.ts` and parse/display logic in `App.tsx`.

**Tech Stack:** Electron IPC, React, TypeScript.

---

### Task 1: Recovery snapshot wrapper

**Files:**
- Modify: `src/renderer/utils/projectFile.ts`

- [ ] Add exported `RecoverySnapshot` and `ParsedRecovery` types.
- [ ] Add `createRecoverySnapshot()` and `parseRecoveryData()`.
- [ ] Update `autoSave()` to write the wrapped snapshot JSON.

### Task 2: Startup banner metadata and cleanup

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] Store parsed recovery data instead of raw string.
- [ ] Show snapshot timestamp, board count, and item count in the banner.
- [ ] Add a window `beforeunload` cleanup handler calling `recovery:clear`.

### Task 3: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

