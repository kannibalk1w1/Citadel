# Index Ledger Design + Plan

Status: approved (user: 'build all of those') and built 2026-07-04.

The Alkemion-inspired table lens: `indexLedgerModel.buildLedgerRows` flattens every relic and thread across chambers into rows (label/type/chamber/sigils + focus point) reusing `buildSearchResult`/`buildThreadSearchResult`; `filterLedgerRows`/`sortLedgerRows` are pure and tested. `IndexLedger.tsx` renders the sortable, siftable table (panel `indexLedger`, Archive-section Ledger button); clicking a row travels — switching chambers if needed — and pulses the search highlight on relics.

- [x] Model + 5 tests; panel + travel; verified over CDP (row listed cross-chamber, click traveled Board 2 → Board 1 and selected the relic). Suite 280 green.
