# Save State Indicator Design

## Goal

Show whether the current Citadel project has unsaved changes and prevent undo history from leaking across opened projects.

## Behavior

- The history store tracks a saved cursor.
- A project is dirty when the current history cursor differs from the saved cursor.
- Successful save marks the current cursor as saved.
- New/open/recovery restore reset the undo history and mark the project clean.
- The right sidebar status strip shows project file name and saved/unsaved state.

## Architecture

`historyStore` owns `savedCursor`, `isDirty()`, `markSaved()`, and `resetHistory()`. `projectFile.ts` calls those methods after save/open/new/load. The sidebar reads `isDirty()` and listens for a lightweight project path event for file-name refreshes.

## Acceptance Checks

- Save marks project clean.
- Adding history events marks project dirty.
- Open/new clears old history.
- Sidebar shows saved/unsaved state.
- Build, typecheck, and tests pass.

