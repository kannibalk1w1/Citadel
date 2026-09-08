# itch.io listing — draft copy

Updated 2026-09-08 for the public 0.3.0 release. This is the copy to paste into
itch's editor; repository fixes after that release are not claimed as shipped.

Pricing rationale is in [citadel-pricing.md](./citadel-pricing.md). What the
listing must and must not claim is settled under **Commercial clarity** in
[release-candidate-checklist.md](./release-candidate-checklist.md).

---

## Form fields

| Field | Value |
|---|---|
| Title | Citadel |
| Short description | An infinite canvas for references, notes, code, and the connections between them. |
| Classification | Tool |
| Kind of project | HTML demo with downloadable desktop builds |
| Pricing | `$0 or donate` — suggested **$5** |
| Platforms | HTML5, Windows, Linux |
| Uploads | `Citadel-0.3.0-setup.exe`, `Citadel-0.3.0-portable.exe`, `Citadel-0.3.0.AppImage`, `citadel-0.3.0.tar.gz`; keep the existing HTML demo |
| Tags | reference, moodboard, art-tools, canvas, notes, research, worldbuilding, open-source, offline, electron |
| Page | https://kannibalkwi.itch.io/citadel |
| Links | Source & issues — github.com/kannibalk1w1/Citadel |
| License | MIT · © 2026 Kieran Beckenkrager |

---

## Page body

Citadel is a desktop board you fill with the things you are working from —
images, video, PDFs, 3D models, notes, code — and then arrange, mark up,
connect, and search. It runs on your machine, keeps your files where you put
them, and never asks for an account.

### What goes on a board

Drag files straight onto the canvas: images, GIFs, video, audio, 3D models and
PDFs. Paste a YouTube link and it embeds. Write text and notes directly. Drop in
a Word document, Markdown or a text file and it arrives as editable text.

There are code cards with syntax colouring in ten languages, colour swatches,
and A/B comparison items that wipe between two images.

Audio can become editable text through local transcription. Choose a model in
Settings, then right-click an audio item and choose Transcribe. Your recordings
stay on your machine.

For a concrete starting point, follow the
[ten-minute research workflow](https://github.com/kannibalk1w1/Citadel/blob/master/docs/research-workflow.md):
collect a few references, put observations beside their sources, connect
contradictions, and turn the result into notes you can find again.

### What it does that a folder doesn't

**Connections that mean something.** Draw a thread between two items and label
what it is — a source, a contradiction, a question, a proof. The relationship
survives the rearranging.

**One search across everything.** The Index searches every board at once: items,
notes, comments, tags, code contents, and connections. Filter by type, tag,
board or source file.

**Vision checks.** Press `Y` to redraw the whole board in greyscale, blurred for
a squint test, or through three colour-blindness simulations. `Shift+M` mirrors
it, which surfaces drawing errors the eye has stopped noticing.

**Study sessions.** Timed reference practice over a queue of items, with pause,
skip and your own interval.

**A time machine.** Scrub the board back through its own history and watch it
assemble and disassemble. Every save leaves a thumbnail in the filmstrip.

**Draw alongside it.** Keep Citadel above your art program, drop its opacity, or
turn on click-through so your strokes land in the app underneath.

### Getting things back out

Export the viewport, a selection or a whole board as PNG or PDF. Save a portable
`.citadelz` archive that bundles every asset. Or send a board out as one
ordinary Markdown file — no plugin, nothing to install on the other side — which
drops straight into Obsidian or any editor.

Pull a colour palette out of any reference image, and keep research captures
attached to the exact region of the image they came from.

### Being straight with you

**This is early access.** Version 0.3.0, made by one person. It is stable enough
that I use it, and there is a guided example project built in that walks you
through every part of it.

**Builds are unsigned.** Windows SmartScreen will warn you the first time. That
is what an unsigned build looks like, not a sign of anything wrong — but you
should know before you download rather than after.

**Updates are manual.** Citadel makes no network request on launch and has no
automatic update check. Remote references, YouTube, and transcription model
downloads use the network when you choose them. Audio transcription stays local.
Come back here for new versions, or let the itch app handle it.

**What I am committing to:** fixing bugs on a reasonable cadence, and reading
every feature request. Not a support contract — just what I actually intend to
do.

**The source is MIT.** If you would rather build it yourself than pay, that is
genuinely fine, and the instructions are in the repository.

---

## Uploading builds

Choose one download for your system:

- **Windows installer:** normal installation, with shortcuts and file associations.
- **Windows portable:** run without installing.
- **Linux AppImage:** a standalone executable; you may need to mark it executable.
- **Linux tar.gz:** unpack the folder and run `citadel` inside it.

Upload the four files separately and set each platform explicitly. Keep the
HTML demo upload. Retire the combined Windows/Linux ZIP only after the separate
uploads are available. The generated `SHA256SUMS.txt` belongs beside the downloads.

Prepare the files with `npm run release:itch -- --source <artifact-directory>`;
see [release-downloads.md](./release-downloads.md) for the exact workflow.

The itch handle is **`kannibalkwi`**, which is not the GitHub one — butler
targets are `kannibalkwi/citadel:<channel>`, and a target naming
`kannibalk1w1` will fail with a project-not-found error that reads like an
authentication problem.

Channel names decide what itch shows as the platform, so they matter:

```bash
butler push dist/itch-0.3.0/Citadel-0.3.0-setup.exe    kannibalkwi/citadel:windows-installer --userversion 0.3.0
butler push dist/itch-0.3.0/Citadel-0.3.0-portable.exe kannibalkwi/citadel:windows-portable  --userversion 0.3.0
butler push dist/itch-0.3.0/Citadel-0.3.0.AppImage     kannibalkwi/citadel:linux-appimage    --userversion 0.3.0
butler push dist/itch-0.3.0/citadel-0.3.0.tar.gz       kannibalkwi/citadel:linux-tar         --userversion 0.3.0
```

Push the artifacts built by the release workflow, not any built locally on
Linux: cross-building Windows through Wine produces a working but different
binary — 111 MB against the runner's 101 MB — so what would ship is not what was
tested.

## Still to do

- **Screenshots** are captured — `docs/screenshots/`, regenerate with
  `node scripts/captureScreenshots.mjs`. Suggested order on the page:
  `01-board-research` (connections and their meanings), `04-vision-value` (the
  greyscale check, the most distinctive thing in the app), `02-board-media`,
  `07-overlay-mode` (the PureRef-style workflow, and the clearest
  single argument for the app), `05-time-machine`, `03-board-code`,
  `06-board-start`.
  - **`02-board-media` has Google's cookie-consent screen inside the YouTube
    embed.** That is what a YouTube item honestly looks like on first load, but
    it reads badly as a store image. Either drop that shot, or accept the embed
    showing a consent prompt.
  - **`07-overlay-mode`** is Citadel floating over Aseprite at 90% opacity, both
    showing the Citadel mark — the drawing on the left, the same image as
    reference on the right with notes and a palette. Captured by hand on a real
    desktop rather than by the script, because it is a photograph of two
    applications.
- **A cover image** (630×500). The rook icon on the canvas dot grid would do it;
  `docs/itch-assets/page-background.png` tiles as that grid.
- **Page styling** — see [itch-page-theme.md](./itch-page-theme.md) for the
  theme-editor values that match the published draft.
- **Choose the revenue share.** itch lets the creator set the platform's cut;
  pick it deliberately rather than accepting whatever the form offers.
