# Citadel UI Vocabulary

Which words the interface uses, and where the archival product language still
applies. Settled 2026-08-15.

This document is the authority for anything a user reads. The archival language
in [Citadel Defining Movement](./citadel-defining-movement.md) remains the
authority for how the product *thinks* — but it is no longer applied to controls.

---

## The rule

**A control gets the plain word. Atmosphere keeps the flavour.**

A control is anything the user must find in order to do something: a menu item,
a button, a tooltip, a panel title, a placeholder, a column header, a prompt, or
a message confirming that a control worked.

Atmosphere is everything else: visual style names and prose in documentation.

This is the line `citadel-defining-movement.md` already drew — *"Interactions
can feel ritualistic when they mark an important cognitive act… Basic
manipulation must remain fast and precise."* Vocabulary drifted past it. A buyer
should never have to translate a word to find a button.

---

## The map

| Concept | Was | Now |
|---|---|---|
| A board in the project | Chamber | **Board** |
| Anything on the canvas | Relic | **Item** (or *file* when it is the source on disk) |
| A line between two items | Thread / Link / Binding | **Connection** |
| Making one | Bind | **Connect** |
| A searchable marker | Sigil | **Tag** |
| A sticky note | Inscription | **Note** |
| A pin attached to an item | Inscription | **Comment** |
| A label on a connection or image marker | Inscription | **Label** |
| A saved viewpoint | Waystone | **Bookmark** |
| The catalogue table | Ledger | **Index** |
| Untagged/missing triage panel | Workbench | **Media review** |
| The presentation pen | Quill | **Pen** |
| The whole file the user saves | Archive | **Project** |
| A `.citadelz` bundle | Archive | **Archive** — this word, and only this |
| The left sidebar | Archive rail | **Project rail** |
| Saving a template | Seal | **Save** |

"Archive" previously named three different things — the rail, the project, and
the `.citadelz` file. It now names only the `.citadelz` file. Everything the
user opens, saves, and works inside is a **project**.

## What kept its flavour

- **Frame variants** on an item: Auto, Plain, Relic, Dossier, Sketch, Evidence.
  These name visual styles, the way an application names a layer effect.
- **Board appearance**: accent presets and an optional floor texture.
- **The name Citadel**, and the tone of the documentation.

Two entries left this list on 2026-08-16. The **mascot effects** (`rune-seal`,
`lightning-out`, `ember-drift`) are gone with the subsystem that ran them, so
there is no longer a naming question. **Ambience** (Still / Motes / Fog),
Presence, Vignette and Glow went with the decorative canvas layer; the
persisted fields stay readable for compatibility but no control exposes them.

## What did not change

Identifiers. `ActionName` strings, store fields, type names, module filenames
(`chamberIdentity.ts`, `relicTemplates.ts`, `ThreadMeaning`) and CSS variables
all keep the archival vocabulary. They are not user-facing, and `ActionName`
strings in particular are persisted as the keys of `keybinds.json` — renaming
one would silently discard a user's custom binding.

Two consequences:

- The keybind panel used to print the raw identifier (`waystone:plant`). It now
  shows the plain name from `src/renderer/keybinds/actionLabels.ts`, with the
  identifier beside it, dimmed. That map is typed `Record<ActionName, string>`,
  so a new action without a label fails the typecheck rather than leaking an id
  into the interface.
- Search still understands the old words. `sigil`, `relic`, `thread` and
  `binding` remain in the search haystacks, and `chamber:` still works as a
  query prefix alongside the new `board:`. Nobody who learned the old vocabulary
  loses their muscle memory.

## Before adding a string

1. Will the user read it? If no, use whatever the surrounding code uses.
2. Is it a control, or a message about one? Use the plain word from the map.
3. Is it a style name or prose? Flavour is welcome.
4. Does the same thing already have a name somewhere else in the app? Use that
   one. Two names for one concept is the failure this document exists to
   prevent — the app shipped `New Board` in the native menu and `New chamber` on
   the rail, for the same button and the same shortcut. That pair, along with
   `Chambers`, `Relics` and the connection inspector's `Thread`, was fixed on
   2026-08-16.

## Before adding an icon-only control

It still needs a name, and the icon cannot supply one: `ToolIcon` renders
`aria-hidden`, so a button holding nothing but an icon reaches a screen reader
as an unnamed button. Give it an `aria-label` in the plain vocabulary above —
`title` alone is not an accessible name. Toggles also take `aria-pressed` so the
on state is not carried by colour alone.
