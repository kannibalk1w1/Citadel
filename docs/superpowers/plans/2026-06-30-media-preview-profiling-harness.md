# Media Preview Profiling Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-only media preview profiling harness for repeatable cold/warm preview-cache sweeps.

**Architecture:** Add a focused renderer performance module that owns activation logic, fixture board creation, and result summarization. Wire it from `App` in a dev-gated effect so normal product behavior is unchanged.

**Tech Stack:** React, TypeScript, Zustand, existing IPC bridge, Vitest.

## Global Constraints

- Harness must require dev mode plus `profile=media-preview` or `#profile-media-preview`.
- No persistent UI.
- No new dependencies.
- Use existing `cache:previewStats` and `cache:clearUnusedPreviews` IPC.
- Tests first for every production behavior.

---

### Task 1: Pure Profiling Model

**Files:**
- Create: `src/renderer/performance/mediaPreviewProfile.ts`
- Test: `src/renderer/performance/mediaPreviewProfile.test.ts`

**Interfaces:**
- Produces: `isMediaPreviewProfileEnabled(locationLike, isDev)`, `createMediaPreviewProfileBoard(paths)`, `summarizeMediaPreviewProfile(options)`

- [ ] **Step 1: Write failing tests for activation, board construction, and summaries.**
- [ ] **Step 2: Run `npm test -- --run src/renderer/performance/mediaPreviewProfile.test.ts` and verify failure.**
- [ ] **Step 3: Implement the pure model.**
- [ ] **Step 4: Re-run the test and verify pass.**

### Task 2: Dev Harness Installer

**Files:**
- Create: `src/renderer/performance/mediaPreviewProfileHarness.ts`
- Test: `src/renderer/performance/mediaPreviewProfileHarness.test.ts`

**Interfaces:**
- Consumes: Task 1 model functions.
- Produces: `installMediaPreviewProfileHarness(options)`.

- [ ] **Step 1: Write failing tests proving inactive installs expose nothing and active installs expose `run`.**
- [ ] **Step 2: Run `npm test -- --run src/renderer/performance/mediaPreviewProfileHarness.test.ts` and verify failure.**
- [ ] **Step 3: Implement the harness with injected store/window/ipc dependencies.**
- [ ] **Step 4: Re-run the test and verify pass.**

### Task 3: App Wiring And Documentation

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `docs/citadel-large-chamber-profile-2026-06-30-real-media-sweep-attempt.md`

**Interfaces:**
- Consumes: `installMediaPreviewProfileHarness`.

- [ ] **Step 1: Write or extend a test proving the installer is dev-gated through its public activation function.**
- [ ] **Step 2: Wire the installer in `App` inside a mount effect.**
- [ ] **Step 3: Document the devtools invocation command shape.**
- [ ] **Step 4: Run focused tests and `npm run build`.**
