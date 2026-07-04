# Presentation Quill Design

Status: **draft — awaiting user approval. Do not implement until approved.**

## Problem

Ref Flow's presentation mode ships live presenter tools: a pen with colour and size, stroke undo, clear-all, and hold-to-record voice. Citadel's presentation mode can only step through sequenced relics — a presenter cannot point, circle, or scrawl over the chamber while talking.

## Goals

- A freehand "quill" available only in presentation mode: draw strokes over the canvas, undo last stroke, clear all.
- Palette held to the effect discipline: chamber accent, `--effect-primary` white, `--effect-mid` grey; two widths.
- Strokes are **ephemeral** — cleared when presentation mode exits, never saved to the project file.
- Reduced motion: strokes appear instantly (no draw-on animation, which there otherwise wouldn't be anyway); no other motion.

## Non-Goals

- No persistent annotation layer on chambers (that is a different, save-format-affecting feature; if wanted later it gets its own spec).
- No shape tools, text-on-stroke, or eraser-by-segment (undo/clear only).
- No pressure/stylus curves in v1.

## Approach

- SVG overlay component (`PresentationQuill.tsx`) mounted only in presentation mode, above relics, capturing pointer events only while the quill tool is active (toggled from the presentation controls; `Q` key while presenting).
- Strokes stored in a small renderer store (`quillStore`: `strokes: { points, color, width }[]`), in **screen space of the presentation viewport** — panning/stepping the sequence keeps strokes glued to the screen like a laser pointer trail, not the canvas (matches presenter intent and dodges canvas-coordinate bookkeeping).
- Stroke undo/clear are quill-store-local (NOT `historyStore` — they are not canvas mutations, must not pollute project undo or recordings).
- Controls join the existing presentation bar: quill toggle, colour (3 swatches), width (2), undo, clear. Voice memo already exists and stays where it is.

## Open Question For Approval

Screen-space ephemeral strokes (recommended, above) vs canvas-space strokes that pan/zoom with the chamber. Screen-space is simpler and presenter-shaped; canvas-space would let a presenter annotate one relic and keep the mark while moving — but edges toward the persistent-annotation feature explicitly out of scope.
