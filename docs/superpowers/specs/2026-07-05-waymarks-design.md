# Waymarks Design + Plan

Status: approved (user: 'build all of those') and built 2026-07-05.

Labeled anchor pins at normalized coordinates inside image relics (`item.meta.waymarks`, cap 16, `waymarks.ts`). Alt+click on a selected image relic plants one (label via InscriptionPrompt); clicking a dot edits its inscription (clearing removes); all edits ride ITEM_STYLE with full meta so undo/redo/recording work. Dots + labels render only while the relic is selected — no cost for dormant relics, no new persistent ornamentation.

- [x] Model + 5 tests (normalize/clamp/cap, add/remove/relabel patches); ImageItem wiring; verified over CDP (Alt+click → prompt → dot; undo removes). Suite 299 green.
