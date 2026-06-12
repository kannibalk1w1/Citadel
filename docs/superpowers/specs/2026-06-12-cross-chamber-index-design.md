# Cross-Chamber Index Search — Design

Date: 2026-06-12
Status: approved direction from `docs/citadel-performance-roadmap.md` active queue item 1.

## Goal

The Living Index currently searches only the active chamber. Expand it so a search
sweeps the whole archive: every chamber's relics, inscriptions, sigils, and threads.
A result from another chamber identifies its chamber and, when focused, travels
there — switching the active chamber, centering the viewport, and running the
existing highlight/binding-reveal path.

## Non-Goals

- No new canvas marks for dormant chambers. `SearchHighlight` keeps reading only
  active-chamber items, so sigil marks remain visibility-aware and capped. After
  travel, marks appear naturally in the newly active chamber.
- No persistent archive index yet (roadmap Data Strategy). Search stays a linear
  scan over in-memory boards; the existing 30-result cap bounds the work surfaced.
- No chamber-name search token (`chamber:`). Add later if needed.

## Result Model (`itemSearchModel.ts`)

- `SearchResult` (both item and thread variants) gains an optional
  `chamber?: { id: string; name: string }`. Absent means "active chamber".
- New `getArchiveIndexResults(boards, activeBoardId, query, limit = 30)`:
  - Runs the existing parse/match pipeline per chamber.
  - Active-chamber results come first, undecorated — identical to today's
    `getIndexResults` output.
  - Other chambers follow in board order; their results carry `chamber` and a
    `chamber: <name>` segment appended to `detail`.
  - The combined list is capped at `limit`.
  - Thread endpoint items resolve against their own chamber's item map.
- `getIndexResults` remains for callers that are intentionally chamber-local
  (`SearchHighlight`, fixtures).

## Focus Path (`TagSearch.tsx`)

- Results come from `getArchiveIndexResults` over `boards` + `activeBoardId`.
- `focusResult` for a result with a foreign `chamber`:
  1. `setActiveBoard(chamber.id)` (clears selection as a side effect).
  2. Re-read store state — viewport scale and connections now belong to the
     target chamber.
  3. Existing behavior unchanged: select + center + transient highlight +
     activate first related Binding for relics; center midpoint + open
     connection properties for threads.
- Arrow-key stepping uses the same path, so stepping through results can travel
  between chambers — the Index "follows trails through the archive".

## Testing

- Model: other-chamber results decorated and ordered after active-chamber ones;
  cap applies across chambers; foreign thread endpoints resolve locally.
- Component: focusing a foreign result switches `activeBoardId`, selects the
  relic, and centers the target chamber's viewport.
