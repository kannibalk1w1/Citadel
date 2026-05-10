# Dragon Scimitar Cursor — Design Spec

**Date:** 2026-05-10
**Feature:** OSRS-themed custom cursor set, toggleable via Fun Settings.

---

## Attribution

### Dragon Scimitar cursor set
- **Source:** https://www.rw-designer.com/cursor-set/dragon-scimitar
- **License:** Creative Commons Attribution
- **Published:** November 20, 2010
- **Required attribution:** "Dragon Scimitar cursor set from rw-designer.com, CC Attribution"
- Must appear in: source file comment + Fun Settings toggle label

### Abyssal Whip cursor
- **Source:** https://www.rw-designer.com/cursor-detail/31818
- **License:** Public Domain
- **Author:** RWCEditor For RuneScape2006
- **Optional attribution (included for completeness):** "Abyssal Whip cursor from rw-designer.com, Public Domain"
- Appears in: source file comment

---

## Cursor Mapping

| Tool / Context | Cursor | Source |
|---|---|---|
| Select, default, cell (sticky/swatch/comparison/YouTube placement) | Dragon Scimitar normal | Dragon Scimitar set |
| Connect tool | Dragon Scimitar Cross | Dragon Scimitar set |
| Lasso tool | Abyssal Whip | Abyssal Whip (31818) |
| Link tool | Dragon Scimitar Hand | Dragon Scimitar set |
| Pan / grab | `grab` (system) | preserved |
| Pan dragging | `grabbing` (system) | preserved |
| Text editing | `text` (system) | preserved |
| Comparison divider | `ew-resize` (system) | preserved |
| Default fallback | `auto` | preserved |

Animated `.ani` variants (wait, busy) are not supported in Chromium CSS cursor URLs and are excluded.

---

## Assets

Downloaded and bundled as Citadel static assets in `src/renderer/assets/cursors/`:

| File | Source |
|---|---|
| `ds-normal.cur` | Dragon Scimitar (standard pointer) |
| `ds-cross.cur` | Dragon Scimitar Cross |
| `ds-hand.cur` | Dragon Scimitar Hand |
| `abyssal-whip.cur` | Abyssal Whip (31818) |

Vite bundles `.cur` files as static assets via `import cursorUrl from '../assets/cursors/ds-normal.cur'`.

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/renderer/assets/cursors/ds-normal.cur` | Bundled cursor |
| `src/renderer/assets/cursors/ds-cross.cur` | Bundled cursor |
| `src/renderer/assets/cursors/ds-hand.cur` | Bundled cursor |
| `src/renderer/assets/cursors/abyssal-whip.cur` | Bundled cursor |
| `src/renderer/arcade/dragonCursor.ts` | Exports cursor CSS strings + attribution constants |

### Modified files

| File | Change |
|---|---|
| `src/renderer/store/uiStore.ts` | Add `dragonCursorEnabled`, `setDragonCursorEnabled` |
| `src/renderer/canvas/CanvasStage.tsx` | Read `dragonCursorEnabled`, swap cursor values in `CURSOR` map |
| `src/renderer/App.tsx` | Load persisted setting on startup |
| `src/renderer/ui/panels/KeybindSettings.tsx` | Add toggle row with attribution |
| `src/renderer/env.d.ts` | Add `declare module '*.cur'` |

### dragonCursor.ts

```ts
/*
 * Dragon Scimitar cursor set — rw-designer.com
 * License: Creative Commons Attribution
 * https://www.rw-designer.com/cursor-set/dragon-scimitar
 *
 * Abyssal Whip cursor — rw-designer.com
 * License: Public Domain
 * Author: RWCEditor For RuneScape2006
 * https://www.rw-designer.com/cursor-detail/31818
 */
import dsNormalUrl from '../assets/cursors/ds-normal.cur'
import dsCrossUrl from '../assets/cursors/ds-cross.cur'
import dsHandUrl from '../assets/cursors/ds-hand.cur'
import whipUrl from '../assets/cursors/abyssal-whip.cur'

export const DS_NORMAL = `url("${dsNormalUrl}"), auto`
export const DS_CROSS  = `url("${dsCrossUrl}"), crosshair`
export const DS_HAND   = `url("${dsHandUrl}"), pointer`
export const DS_WHIP   = `url("${whipUrl}"), crosshair`
```

### CanvasStage.tsx

When `dragonCursorEnabled` is true, the `CURSOR` map entries are overridden:

```ts
const CURSOR = dragonCursorEnabled
  ? {
      select:     DS_NORMAL,
      pan:        'grab',          // preserved
      lasso:      DS_WHIP,
      connect:    DS_CROSS,
      text:       DS_NORMAL,
      sticky:     DS_NORMAL,
      link:       DS_HAND,
      tag:        DS_NORMAL,
      swatch:     DS_NORMAL,
      comparison: DS_NORMAL,
      default:    DS_NORMAL,
    }
  : {
      pan:     'grab',
      connect: 'crosshair',
      text:    'text',
      sticky:  'cell',
      swatch:  'cell',
      comparison: 'cell',
      lasso:   'crosshair',
      default: 'default',
    }
```

### uiStore additions

```ts
dragonCursorEnabled: boolean        // default false, persisted 'ui.dragonCursorEnabled'
setDragonCursorEnabled: (v: boolean) => void
```

### Settings toggle

In the Fun Settings section of `KeybindSettings.tsx`, after the HyperType row:

```
☐ Dragon Scimitar cursor
    Dragon Scimitar set: rw-designer.com (CC Attribution)
    Abyssal Whip: rw-designer.com (Public Domain)
```

---

## Out of Scope

- Animated wait/busy cursors (`.ani` format not supported in Chromium CSS)
- Per-item-type cursor variants
- Cursor size customisation
