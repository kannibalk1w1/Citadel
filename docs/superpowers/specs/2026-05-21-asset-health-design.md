# Asset Health Check Design

## Goal

Show whether the open project has missing local asset files.

## Behavior

- Settings Maintenance shows a local asset health line.
- The check counts referenced local item `src` paths and how many are missing.
- URL-like sources are ignored.
- Refresh re-runs the check.
- Missing assets are reported as a count only for now; relinking is a later workflow.

## Architecture

The renderer collects current item `src` values and sends them to a main-process IPC handler. The main process checks filesystem existence and returns totals. This preserves the renderer-never-touches-files rule.

## Acceptance Checks

- Maintenance displays local asset count and missing count.
- Check goes through IPC.
- URL sources are ignored.
- Build, typecheck, and tests pass.

