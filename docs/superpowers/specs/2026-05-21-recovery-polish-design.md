# Recovery Polish Design

## Goal

Make crash recovery less noisy and more useful by clearing normal-exit recovery files and showing recovery snapshot context.

## Behavior

- Recovery autosaves store a wrapped payload with snapshot metadata.
- Existing legacy recovery files containing raw project JSON still restore.
- The startup recovery banner shows when the snapshot was captured and the board/item counts.
- A normal window unload clears the recovery file, matching the existing main-process comment.
- Manual restore and discard still clear the recovery file.

## Architecture

The renderer creates a `RecoverySnapshot` wrapper around the existing serialized project data. Main IPC continues to write/read the recovery file without touching renderer state. `App.tsx` parses either the new wrapper format or the legacy raw project format before showing the recovery banner.

## Acceptance Checks

- Legacy recovery JSON still restores.
- New wrapped recovery snapshots restore.
- Normal unload invokes `recovery:clear`.
- Build, typecheck, and tests pass.

