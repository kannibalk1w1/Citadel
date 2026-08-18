# Third-Party Notices

Citadel bundles the works listed below. Each entry names the source, the licence,
and the attribution the licence requires. Distributed builds of Citadel must ship
this file.

Last audited: 2026-08-17.

---

## Typefaces

Citadel bundles Latin and Latin-Extended `woff2` subsets in
`src/renderer/theme/fonts/`, declared in `src/renderer/theme/fonts.css`. All four
families are licensed under the SIL Open Font License 1.1; the full licence text
is in [`licenses/OFL-1.1.txt`](licenses/OFL-1.1.txt).

- **Cinzel** — Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel), OFL 1.1
- **Inter** — Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter), OFL 1.1
- **JetBrains Mono** — Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono), OFL 1.1
- **Press Start 2P** — Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P", OFL 1.1

The font files are unmodified subsets as published by Google Fonts. No font is
renamed, so no Reserved Font Name is infringed.

---

## HyperType

The arcade keystroke feature (`src/renderer/arcade/HyperTypeEngine.ts`,
`src/renderer/arcade/HyperTypeOverlay.tsx`) adapts code and bundles the three
chiptune samples in `src/renderer/assets/sounds/` from the HyperType VS Code
extension.

- Source: https://github.com/Thanh-Huy1104/hypertype
- Sounds: `ht-type.mp3` (from `media/sounds/multhit1.mp3`), `ht-enter.mp3` (from `media/sounds/gold_seal.mp3`), `ht-slice.mp3` (from `media/sounds/slice1.mp3`)

```
MIT License

Copyright (c) 2025 Thanh-huy1104

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Cursors

**No cursor artwork ships in Citadel.** The app uses the operating system's own
pointers. Cursor art is distributed as a separate `.citadel-cursors.json` pack,
imported by the user from Fun Settings, and any pack carries its own attribution
wherever it is published.

The Dragon Scimitar pack published alongside Citadel is built from:

- **Dragon Scimitar cursor set** (`ds-normal.cur`, `ds-cross.cur`, `ds-hand.cur`) — from [rw-designer.com](https://www.rw-designer.com/cursor-set/dragon-scimitar), Creative Commons Attribution, published 20 November 2010.
- **Abyssal Whip cursor** (`abyssal-whip.cur`) — by RWCEditor For RuneScape2006, from [rw-designer.com](https://www.rw-designer.com/cursor-detail/31818), Public Domain, published 26 December 2011.

Licence text: https://creativecommons.org/licenses/by/3.0/

> These cursors depict weapons from *Old School RuneScape*. The rw-designer
> licence covers the cursor artwork's author, not Jagex's underlying trade
> dress. That exposure no longer touches the product sold for money, because
> the pack is a free, separate download rather than something bundled into a
> paid build — but whoever publishes the pack still owns that call.

---

## Icons

Adapted SVG paths from [Game-icons.net](https://game-icons.net/) under the
Creative Commons Attribution 3.0 Unported licence.

- Watchtower by Delapouite, CC BY 3.0: https://game-icons.net/1x1/delapouite/watchtower.html
- Templar Eye by Lorc, CC BY 3.0: https://game-icons.net/1x1/lorc/templar-eye.html
- Scroll Unfurled by Lorc, CC BY 3.0: https://game-icons.net/1x1/lorc/scroll-unfurled.html
- Crowned Skull by Lorc, CC BY 3.0: https://game-icons.net/1x1/lorc/crowned-skull.html

Licence text: https://creativecommons.org/licenses/by/3.0/

---

## Bundled runtime libraries

Shipped inside the packaged application:

| Package | Licence |
|---|---|
| electron | MIT |
| electron-updater | MIT |
| gifler | Apache-2.0 |
| html2canvas | MIT |
| jspdf | MIT |
| jszip | MIT OR GPL-3.0-or-later (Citadel uses it under MIT) |
| konva | MIT |
| mammoth | BSD-2-Clause |
| nanoid | MIT |
| pdfjs-dist | Apache-2.0 |
| react | MIT |
| react-dom | MIT |
| react-konva | MIT |
| three | MIT |
| use-image | MIT |
| zustand | MIT |

Electron itself bundles Chromium and Node.js, which carry their own notices;
Electron Builder writes a `LICENSES.chromium.html` alongside the packaged app.
Do not delete it from a distributed build.

---

## Unverified provenance — none

Every asset that ships is now original work generated from a source in this
repository:

- `resources/icon.ico` and `resources/icon.png` are rendered from
  `resources/icon.svg` by `scripts/buildIcons.mjs`. The icon is the same rook
  that appears on the project rail, drawn in the app's own palette.
- `examples/showcase.citadel` carries its media inline as data URIs, synthesised
  by ffmpeg from its own generators (gradients, test patterns, a sine tone) via
  `scripts/buildShowcase.mjs`.

The three assets previously listed here are gone: `arcane-stone-canvas-tile.png`
(the canvas moved to a procedural dot grid), `CitadelTower.png` (the mascot is
now drawn as inline SVG), and the placeholder `resources/icon.ico` replaced
above.
