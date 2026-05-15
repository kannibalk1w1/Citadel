# Lock Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make locked items visible and enforce lock protection across editing, transforms, context menu, and keyboard actions.

**Architecture:** Use existing `CanvasItem.locked` and `ItemProperties` checkbox. Add a shared padlock overlay in `ItemRenderer`, keybind/context-menu toggles, and locked-item filters in destructive actions.

**Tech Stack:** React, TypeScript, Zustand, Konva/react-konva.

---

## Task 1: Keybind and Action

**Files:**
- Modify `src/renderer/keybinds/actions.ts`
- Modify `src/renderer/keybinds/defaultKeybinds.ts`

- [ ] Add `TOGGLE_LOCK: 'item:toggleLock'` to `Actions`.
- [ ] Add `[Actions.TOGGLE_LOCK]: ['ctrl+l', 'meta+l']` to `defaultKeybinds`.
- [ ] Run `npm.cmd run build`.

---

## Task 2: App Action Guards

**Files:**
- Modify `src/renderer/App.tsx`

- [ ] Register `Actions.TOGGLE_LOCK`.
- [ ] Filter locked items out of Delete, Cut, Duplicate, and ordering handlers.
- [ ] Push `ITEM_STYLE` history events when toggling lock.
- [ ] Run `npm.cmd run build`.

---

## Task 3: Context Menu

**Files:**
- Modify `src/renderer/ui/ContextMenu.tsx`

- [ ] Add `selectedUnlockedItems`, `selectedLockedItems`, `canLock`, and `canUnlock`.
- [ ] Delete, Duplicate, and ordering actions operate only on unlocked selected items.
- [ ] Add Lock and Unlock context menu entries.
- [ ] Run `npm.cmd run build`.

---

## Task 4: Canvas Indicator and Transform/Edit Guards

**Files:**
- Modify `src/renderer/canvas/ItemRenderer.tsx`
- Modify `src/renderer/canvas/items/ImageItem.tsx`
- Modify `src/renderer/canvas/items/GifItem.tsx`
- Modify `src/renderer/canvas/items/TextItem.tsx`
- Modify `src/renderer/canvas/items/StickyItem.tsx`
- Modify `src/renderer/canvas/items/SwatchItem.tsx`
- Modify `src/renderer/canvas/items/ComparisonItem.tsx`

- [ ] Add a non-interactive padlock marker for locked items in `ItemRenderer`.
- [ ] Render Transformers only when selected and not locked.
- [ ] Prevent double-click editing for locked text/sticky items.
- [ ] Run `npm.cmd run build`.

---

## Task 5: Final Verification

- [ ] Run `npm.cmd run build`.
- [ ] Run `git diff --check`.
- [ ] Commit all changed files.
