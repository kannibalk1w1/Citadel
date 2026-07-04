# Relic Templates Design + Plan

Status: approved (user: 'build all of those') and built 2026-07-04.

Selection → 'Seal as template…' (context menu, named via the new InscriptionPrompt) → stored in user settings (`templates.relics`, cap 24, cross-project) → stamped from the board navigator at the viewport centre with fresh ids and remapped internal threads; stamping pushes ITEM_ADD/CONNECTION_ADD so undo works.

Discoveries fixed en route: Electron does not implement window.prompt, which had silently broken board rename and thread-label editing — replaced all five call sites with the askInscription modal; UNDO/REDO gained CONNECTION_ADD branches (binding creation was never undoable).

- [x] Model + 5 tests (relative capture, index-mapped threads, deep-copied stamp, normalize cap); store persisted via settings IPC; verified over CDP end-to-end (seal → list → stamp cross-chamber → undo). Suite 288 green.
