# Making the itch page look like the artifact

The published draft is styled in Citadel's own palette. itch's theme editor can
get most of the way there; the rest it cannot do, and this says which is which.

**Custom CSS is not available by default.** itch grants it per account on
request — you contact support and say what you want to change. Everything below
works without it.

---

## Theme editor values

Edit project → **Edit theme**. These are the app's own tokens, so the page and
the screenshots agree.

| Field | Value | What it is in the app |
|---|---|---|
| BG | `#0f0d0b` | `--bg-canvas` |
| BG2 (content column) | `#17130f` | `--bg-ui` |
| Text | `#e8ddd0` | `--text-primary` |
| Links | `#73a8db` | `--accent` |
| Buttons | `#73a8db` | `--accent` |
| Headers | `#e8ddd0` | `--text-primary` |

Under **More options**, set BG2 opacity to around **92%** so the dot grid shows
faintly through the content column rather than being hidden behind it.

### Fonts

Both are on Google Fonts, which the theme editor offers in full, and both are
what the app itself uses:

- **Body:** Inter
- **Headers:** Inter

There is no third slot, so JetBrains Mono — the app's mono face, and what the
artifact uses for labels — cannot be set page-wide. It survives only inside
fenced code blocks in the description.

### Background image

Upload `docs/itch-assets/page-background.png`. It is a 32×32 tile of the same
dot grid the canvas draws — `--bg-canvas` ground with `--canvas-dot` marks — so
the page sits on the app's own surface. Set it to **repeat**.

### Layout

Set screenshots to **Sidebar** if you want them beside the text, or **Hidden**
for a single column that reads closer to the artifact. The first screenshot is
the one itch shows at the top of the page either way, so make it
`01-board-research.png`.

---

## What the theme editor cannot do

The artifact leans on three things itch has no field for:

- **The card grid** under "What it does that a folder doesn't". itch's
  description strips layout HTML, so those six cards become six paragraphs.
  Lead each with a bold phrase — `docs/itch-listing.md` is already written that
  way — and they read fine as a list.
- **The mono field table.** That block is for you, not buyers; it does not
  belong on the page at all.
- **The accent rule** on the "Being straight with you" panel. A `> blockquote`
  is the nearest thing the description supports and carries the same "read this
  bit" weight.

Descriptions do support **Header 2**, which itch styles to match its own section
headers — use it for the section titles rather than bold text.

---

## Order of the screenshots

1. `01-board-research` — connections and their meanings
2. `07-overlay-mode` — Citadel over a drawing program, the clearest argument
3. `04-vision-value` — the greyscale check
4. `05-time-machine`
5. `03-board-code`
6. `06-board-start`

`02-board-media` is deliberately absent: its YouTube embed is showing Google's
cookie-consent screen. Honest, but not a first impression.
