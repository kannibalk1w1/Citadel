# Citadel 0.4.0

Prepared for the `v0.4.0` tag. Nothing here is packaged or uploaded until that
tag builds and its draft release is published.

The theme is research. Documents arrive with their formatting, a PDF becomes
something you can page through and search rather than a single cover image, and
a transcript points back at the moment in the recording it came from. The rest
is reliability work found in a review of the 0.3.0 code: exports, undo, and what
happens to a project when two things run at once.

---

## Formatted documents

**Word and Markdown files keep their shape.** Drop a `.docx` or `.md` on a board
and headings, bold, italic, lists and link labels appear on the canvas instead of
one undifferentiated wall of text. It is still an ordinary text item, so it is
searchable, exportable and undoable exactly as before.

**You can edit the document.** Double-click it, or use Edit document in the item
panel. The editor is Markdown, with buttons for heading, bold, italic, list and
link. Clicking outside commits one undoable edit; Escape cancels. Markdown export
keeps the formatting, and the file you imported is never written to.

This is readable formatting, not Word page layout. The exact supported subset,
and what is deliberately left out, is written down in
[Basic document formatting](citadel-document-formatting.md). No HTML is created
or rendered anywhere in the path, and Mammoth is stopped before it can reach an
embedded image or an external reference.

## Multi-page PDFs

**A PDF is no longer just its first page.** Select an imported PDF and the item
panel gains a PDF document section: Previous and Next, or type a page number and
choose Go. Page changes go through undo and redo like anything else.

**You can search the text inside it.** Type into Search PDF text, choose Search
PDF, and click a result to jump to that page. The search stays inside that one
document; the project-wide Index is unchanged.

Only the page you are looking at is rasterised. Search reads embedded text, so a
scanned PDF needs OCR somewhere else first, and a password-protected file is
still refused. The work is bounded at 64 MB, 500 pages and 30 seconds, and a
limit or a failure is reported in the panel rather than swallowed. Cancel stops
pending work, and Open PDF retries a read that was interrupted.

## Transcript timestamps

**Click a sentence to find it in the recording.** Select a transcript and open
Original recording transcript in its item panel. Clicking a timestamp focuses the
audio it came from and seeks to that moment. Playback stays paused, so press Play
when you want to hear it. An offscreen recording is brought into view first.

These are the recognition segments as whisper produced them, so editing the
transcript text does not rewrite their timing. Older transcripts work wherever
their original source can still be identified safely, and an ambiguous, hidden or
missing source is refused rather than guessed at.

Duplicating a board, or copying an audio item together with its transcript,
keeps the pair pointing at each other. Relic templates carry the link too.

---

## Exports

**Connections are in the picture.** Threads between items are drawn by an SVG
overlay the stage capture never saw, so every exported image and PDF came out
with the items but none of the relationships between them. They are now painted
into the export in the same order they sit on the board: above the canvas, below
video and 3D.

**Fit to board and fit to selection actually fit.** The fitted viewport was
computed in device pixels against a canvas measured in CSS pixels, so on any
display with a pixel ratio above 1 the result was framed wrong. Rotated items
also counted as their unrotated rectangle, which cropped the corner a turned item
was sticking out of.

**Export selection exports the selection.** Unselected Konva items were left in
the frame; they are now filtered out for the duration of the capture.

**An export cannot be changed by what happens after it.** The bitmap is frozen
before any asynchronous work begins, a second export is refused while one is
running, and an export that is interrupted by opening another project stops
rather than restoring its view over the project you just opened.

Poster decoding for video and 3D stills is now deduplicated, limited to four at a
time, and skipped for anything offscreen.

## Undo, and knowing when a project is unsaved

**Group, ungroup and the ordering commands are undoable.** They mutated items
without dispatching an event, so undo skipped straight past them and a recording
never replayed them. They now dispatch one batched event, including for the
neighbours displaced by an order swap.

**Relinking a missing asset is undoable, and it finds sources in metadata.** It
previously rewrote only `src`, so a transcript's or a PDF's recorded source path
was left pointing at the old location.

**The unsaved marker cannot be cleared by accident.** Undoing back to the same
history position on a different branch was enough to make a modified project look
saved. Opening a project now clears history outright and loads only that
project's own recordings.

## Projects and assets

**Two projects no longer share an extraction folder.** Each `.citadelz` import
extracts into its own directory, and an import that fails removes only what it
extracted, never the assets of a project already open.

**Archives carry the whole source.** A `.citadelz` now bundles PDF originals
alongside their page previews, and audio and transcript sources including
recording snapshots. An ordinary save copies external local sources into the
project's assets folder.

## Performance

**Typing in the Index does not rebuild it.** Building the rows walks every item
and connection on every board, and it shared a memo with the filter text, so one
keystroke rebuilt the lot. It is now three passes keyed on what each depends on,
with a test that fails if a keystroke or a sort click walks the boards again.

**Culling handles rotated items and a resized window.** A rotated item was
measured as its unrotated rectangle, so it could vanish near the edge of the
viewport.

**The audio waveform stops leaking.** It reused neither its sample buffer nor its
drawing context, and it kept its media graph alive after the item was gone or its
source changed. Both are released on unmount now.

## Dependencies

pdf.js is on 6, using its maintained legacy build for Electron 29 rather than a
handwritten shim, and jsPDF, Mammoth, nanoid and electron-updater have all moved
up. `npm audit --omit=dev` reports nothing. The full tree still reports 27
advisories across Electron, the builder and the test tooling, so this is not a
clean full-stack audit: a coordinated Electron, electron-builder, Vite and Vitest
upgrade is separate work and needs a packaged pass on both platforms.

## Release plumbing

`npm run release:itch` prepares the four desktop downloads and their checksums
from artifacts the release workflow already built. It verifies, copies and writes
a manifest; it does not build, upload or publish anything, and it refuses to
overwrite an output directory. The workflow is in
[release-downloads.md](./release-downloads.md).

The itch listing copy is updated for 0.3.0, and the handle in it is corrected to
`kannibalkwi`. A `kannibalk1w1` butler target fails with a project-not-found
error that reads like an authentication problem.

There is also a ten-minute walkthrough for new users,
[from references to a useful research board](./research-workflow.md), and a
summary of the research additions above in
[research features](./research-features.md).
