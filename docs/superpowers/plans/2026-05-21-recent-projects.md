# Recent Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent recent projects list and sidebar reopen controls.

**Architecture:** Store recent project metadata through existing settings IPC from `projectFile.ts`. Render a compact list in `RightSidebar.tsx` and use a custom window event to refresh after save/open changes.

**Tech Stack:** React, TypeScript, Electron IPC settings.

---

### Task 1: Project file recent-list API

**Files:**
- Modify: `src/renderer/utils/projectFile.ts`

- [ ] Add `RecentProject` type and helper functions to get/set recents.
- [ ] Add recent update calls after successful save/open.
- [ ] Add `openRecentProject(path)` for sidebar buttons.

### Task 2: Sidebar recent UI

**Files:**
- Modify: `src/renderer/ui/RightSidebar.tsx`

- [ ] Add a compact `RecentProjects` component.
- [ ] Load recents on mount and on the custom refresh event.
- [ ] Render up to five path buttons between quick actions and status.

### Task 3: Verification

**Commands:**
- `npm.cmd run build`
- `npm run typecheck`
- `npm test -- --run`
- `git diff --check`

Expected: all commands exit 0.

