# In-Text Relic References Design + Plan

Status: approved (user: 'build all of those') and built 2026-07-04.

Wiki-style `[[reference]]` tokens inside inscriptions (`inscriptionRefs.ts`). Deliberately phrase-based, not id-based: a reference is a query the Living Index chases, so renaming or relinking relics never breaks it. Refs join the search haystack and detail line, and the Codex panel shows chase-chips that open the Index pre-filled.

- [x] Parser + 6 tests (trim, dedupe case-insensitively, empty guard); search model integration; Codex 'References' chips; verified over CDP (chip appears after blur-commit, chase opens Index with the phrase). Suite 294 green.
