# Unsaved Guard Design

## Goal

Prevent accidental loss of unsaved project changes when starting or opening another project.

## Behavior

- If the history store is dirty, New Project asks for confirmation before clearing the canvas.
- If the history store is dirty, Open and Recent Project asks for confirmation before replacing the current project.
- If the user cancels, the current project remains untouched.
- Save and Save As behavior is unchanged.

## Architecture

`projectFile.ts` owns the guard because it already centralizes new/open/recent project flows. It uses `historyStore.isDirty()` and `window.confirm()`. `newProject()` returns a boolean so callers only trigger startup effects when the project actually changed.

## Acceptance Checks

- Dirty project blocks New/Open/Recent when cancelled.
- Clean project proceeds without prompting.
- Existing save/load paths still work.
- Build, typecheck, and tests pass.

