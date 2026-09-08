# Research features in the development build

These additions follow the published 0.3.0 release; they have not been uploaded
to itch.io or published as installers.

## Formatted documents

Drop a Word `.docx` or Markdown file onto the board. Basic headings, emphasis,
lists and link labels appear directly on the canvas. Select **Edit document**
or double-click to edit its Markdown. The toolbar inserts common formatting;
click outside to commit one undoable edit, or Escape to cancel. Markdown export
retains the source formatting. The original imported file is never changed.

This is not full Word layout or full CommonMark. See
[Basic document formatting](citadel-document-formatting.md) for exact support.

## Multi-page PDFs

Select an imported PDF. In **PDF document**, use Previous/Next, or enter a
**Page** and choose **Go**. Enter words in **Search PDF text**, choose
**Search PDF**, then click a result to display its page. Page changes support
undo/redo. **Cancel** stops pending work; **Open PDF** retries an interrupted
initial read. Search stays within this PDF, not the project-wide Index.

Only the displayed page is rasterized. Search reads embedded text, so scanned
pages need OCR elsewhere first. Password-protected PDFs are not supported.
Work is bounded to 64 MB, 500 pages, 100,000 characters per page, 2 million
characters overall, 100 results, a 200-character query and 30 seconds. A limit
or failure is reported in the panel. Keep separate PDF items for page-specific
image marks or captures: existing annotations belong to the item, not a page.

## Transcript timestamps

Transcribe an audio item using the existing local transcription setup. Select
the resulting text and open **Original recording transcript** in its item
panel. Click a timestamp to focus the source audio and seek to that moment.
Playback stays paused; press Play to listen. Offscreen audio is brought into view.

These are the original recognition segments with approximate timestamps.
Editing the transcript does not rewrite their text or timing. Missing, hidden,
ambiguous, or invalid audio sources cannot be sought; older transcripts work
when their original source can be identified safely.

## Keeping sources together

Normal saves copy external local sources into the project's assets folder.
Portable `.citadelz` archives include PDF originals as well as page previews,
audio and transcript source references, including recording snapshots. Keep
the project and its assets together. Duplicate a whole board or copy audio and
its transcript together to keep the copied pair linked.
