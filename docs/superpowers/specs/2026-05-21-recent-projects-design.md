# Recent Projects Design

## Goal

Make recently opened or saved Citadel projects quickly reopenable from the right sidebar.

## Behavior

- Opening, importing, saving, or Save As-ing a project adds it to a recent projects list.
- The list stores path, display name, and last-opened timestamp in the existing settings store.
- The right sidebar shows up to five recent projects.
- Clicking a recent project opens it directly.
- Missing or invalid recent paths fail quietly and trigger the normal open failure path.

## Architecture

The renderer keeps the list because recent project updates are tied to renderer project state. Persistence still goes through IPC via `settings:get` and `settings:set`.

`projectFile.ts` exposes `openRecentProject(path)`, updates recents after successful open/save, and dispatches a lightweight browser event so mounted UI can refresh.

The right sidebar owns display only. It reads recents on mount, listens for the refresh event, and calls `openRecentProject()`.

## Acceptance Checks

- Successful save/open adds a project to recents.
- Duplicate paths move to the top instead of duplicating.
- Sidebar recent buttons can open `.citadel` and `.citadelz`.
- Build, typecheck, and tests pass.

