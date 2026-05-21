# Save Activity Status Design

## Goal

Show when Citadel last completed a manual save and a recovery autosave.

## Behavior

- Successful manual save updates a last-saved timestamp.
- Successful recovery autosave updates a last-autosave timestamp.
- The right sidebar status strip displays both timestamps when available.
- New/open/recovery restore clears the visible timestamps for the new project context.

## Architecture

`projectFile.ts` owns save activity state because it centralizes save/open/autosave. It exports `getSaveActivity()` and dispatches a lightweight browser event when timestamps change. `RightSidebar.tsx` listens and renders compact time labels.

## Acceptance Checks

- Manual save updates sidebar status.
- Autosave updates sidebar status.
- New/open clears stale timestamps.
- Build, typecheck, and tests pass.

