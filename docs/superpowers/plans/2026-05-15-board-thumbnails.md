# Board Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tiny item-layout thumbnails to board tabs.

**Architecture:** Add a local `BoardThumbnail` canvas helper inside `BoardTabs.tsx`, rendering from `CanvasBoard.items` using minimap-style bounds fitting and type colours.

**Tech Stack:** React, TypeScript, Canvas 2D, Zustand.

---

## Task 1: BoardTabs Thumbnail Helper

**Files:**
- Modify `src/renderer/ui/BoardTabs.tsx`

- [ ] Add `CanvasBoard` type import.
- [ ] Add thumbnail constants `THUMB_W = 52`, `THUMB_H = 28`.
- [ ] Add an `itemColour` helper matching `Minimap`.
- [ ] Add a `BoardThumbnail` component that renders board items to a canvas.
- [ ] Render `BoardThumbnail` before each board name.
- [ ] Run `npm.cmd run build`.

---

## Task 2: Final Verification

- [ ] Run `npm.cmd run build`.
- [ ] Run `git diff --check`.
- [ ] Commit and push.
