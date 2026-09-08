# Basic document formatting

DOCX and Markdown imports remain ordinary `text` items. The canvas displays
basic formatting with Konva text runs; double-click the item to edit Markdown.
The editor provides Heading, Bold, Italic, List and Link insertion controls.
Enter adds a new line, clicking outside saves one undoable edit, and Escape
restores the original text and formatting. Resize an item to show more text;
the editor scrolls to reach content below its canvas bounds.

Supported subset:

- Word: paragraphs, Heading 1–6 paragraph styles, bold, italic, combined emphasis,
  ordered and unordered list paragraphs with up to six indentation levels, and
  explicit HTTP, HTTPS and mailto link destinations. Table cells flatten into
  paragraphs in reading order. Word list numbering becomes sequential decimal
  numbering; custom numbering, restart values and bullets are not reproduced.
- Markdown: paragraphs and line breaks, ATX and setext headings, `*`/`_` emphasis,
  `**`/`__` strong emphasis, `***` combined emphasis, simple ordered/unordered
  list lines, blockquotes, inline backtick code, fenced code, and inline links.
  Markdown source is retained for editing and export, including syntax outside
  this subset; unsupported constructs display as literal text. Images show
  their alt text only. Reference links, tables, task checkboxes, full CommonMark
  delimiter rules and advanced nested formatting are not interpreted.
- Links retain a styled label and destination in Markdown; the canvas does not
  navigate them. Raw HTML displays literally. There is no HTML rendering,
  contenteditable surface, document script execution, embedded media loading,
  image decoding, or automatic network request.

This is readable document formatting, not Word page-layout fidelity. Fonts,
colors, margins, columns, exact table layout, comments, footnotes, tracked-change
presentation, embedded objects and pictures are not reproduced. Canvas text
uses the item's font size, alignment, whole-item bold/italic settings, and theme
colors. Ordinary `.txt` imports and old text items retain their literal behavior.

The existing local-file boundary, 25 MB input limit, 200,000 character text
limit, UTF-8/UTF-16 BOM decoding, legacy/protected Word refusals, and 15-second
read timeout remain. Truncation is marked visibly and does not modify the source.
Structured data also has bounded blocks, runs, and Markdown source size; very
complex inputs can reach those bounds before the text limit. Markdown editing
normally shares the text source limit; imported Word source can retain additional
escaping/link syntax up to the separate 1,000,000-character metadata limit.
A formatting-dense edit exceeding the plain-text limit falls back to bounded
plain text with a visible notice. The Mammoth timeout bounds caller waiting,
not cancellation of the underlying conversion.

## Integration contract

`DocumentExtraction` adds optional `richDocument` and `markdown`. The structured
model is `RichDocument { version: 1, blocks }`, with allowlisted block kinds and
text runs carrying optional bold, italic, code and safe href fields. No HTML is
created or transported. Mammoth's `transformDocument` hook consumes its parsed
Word tree and returns an empty tree, with external access and embedded style
maps disabled, before its converter can render document content or read images.

`buildDocumentItem` stores these as `meta.richDocument` and
`meta.documentMarkdown`; `meta.content` always contains the plain-text projection
for content search and plain exports. Source path and existing import metadata
remain unchanged. Save/reopen and undo need no new item or event types.

Renderer helpers in `src/renderer/canvas/richDocument.ts`:

- `itemRichDocument(meta)` validates version/shape/limits/link schemes and checks
  its plain projection equals `meta.content`. It returns null for old items or
  stale rich metadata left behind by a plugin/older editor changing plain text.
- `documentEditorSource(meta)` returns source Markdown for a current valid rich
  item, otherwise literal plain content. Markdown export can use it after
  checking `itemRichDocument(meta)`.
- `documentTextMetaPatch(meta, source)` returns an immutable, atomic metadata
  patch for a Markdown edit. A caller must merge it with meta and push the
  before/after snapshot through the existing `ITEM_STYLE` history event.
- `DocumentFormattingTools` is a reusable toolbar accepting a textarea ref and
  a source-change callback. ItemProperties can instead offer an Edit document
  button that sets `editingItemId`; the existing overlay supplies this toolbar.

Visible canvas layout stops at item height and 4,000 positioned runs, and clips
at item bounds. Rich validation is memoized per metadata object in `TextItem`.
