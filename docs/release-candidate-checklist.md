# Citadel Release-Candidate Checklist

The state of Citadel as a paid early-access release, and what still stands between
the current build and one a buyer can be charged for.

This is the commercial-readiness document. [Release Readiness Lite](./release-readiness-lite.md)
remains the mechanical how-to for building and packaging a local Windows alpha;
this file says whether the result is fit to sell.

**Scope of the first release: Windows x64 only.** Everything below is written
against that. Linux and macOS are addressed in [Platform scope](#platform-scope).

Last reviewed: 2026-08-15.

---

## Verdict

Not yet shippable as a paid build. The archive itself is in good order — the
save/open path is covered by tests, the `.citadelz` rites are hardened, and the
interface no longer depends on the network. What is missing is the apparatus
around it: nothing is signed, an update check runs against a host that does not
exist, the licence is undeclared, and a first-run buyer lands in an empty chamber
with nothing to look at. A tag now builds and drafts a release on its own
(item 4), which leaves the certificate as the only thing standing between the
current pipeline and a downloadable artifact that does not frighten anyone.

None of the remaining items is large. They are listed in priority order in
[Blocking work](#blocking-work).

---

## What is ready

- **The archive round trip.** Raising a chamber, sealing it as a `.citadel`,
  reopening it, and finding relics, sigils, and threads intact is covered by
  `src/main/projectPersistence.test.ts` and
  `src/renderer/utils/projectRoundTrip.test.ts`, including relic copy-in,
  filename collisions, and moved project folders.
- **Archive rites.** `.citadelz` import enforces path-traversal safety, entry
  and size limits against lying headers, and cleans up partial extractions.
  `src/main/archiveZip.test.ts` runs on Windows and POSIX alike.
- **Offline rendering.** Typefaces are bundled; no stylesheet, font, or asset is
  fetched at launch. Guarded by `src/renderer/theme/fonts.test.ts`.
- **Third-party notices.** Audited 2026-08-15; see `THIRD_PARTY_NOTICES.md`.
- **Crash recovery.** Dirty work is written to a recovery snapshot and offered
  back on the next launch.
- **Test suite.** `npm test -- --run` is fully green on Linux and Windows.

---

## Blocking work

Ordered by how much each one costs a buyer's trust.

### 1. Licence declaration

`README.md`, `AGENTS.md`, and `package.json` all say MIT, but no `LICENSE` file
exists and `package.json` sets `"private": true` with an empty `author`.

**Owner decision, not an engineering one.** MIT source plus a paid binary is a
legitimate model, but it means a buyer may rebuild and redistribute the app for
free, and it cannot be walked back once published. Decide, then act:

- If MIT stands — add `LICENSE` with the MIT text and the copyright holder's
  legal name and year, fill in `package.json`'s `author`, and drop `"private"`.
- If the release is to be source-available or proprietary — correct `README.md`
  and `AGENTS.md` before any public tag, and pick a licence that matches.

Either way this must be settled before the first paid build, because the licence
that ships with v1 is the licence buyers keep.

### 2. Code signing

Builds are unsigned. Windows SmartScreen will warn on every install and portable
launch, and an unsigned paid download reads as malware to a first-time buyer.

The release workflow is now signing-ready: it passes `CSC_LINK` and
`CSC_KEY_PASSWORD` through to electron-builder from the `WINDOWS_CERT_BASE64`
and `WINDOWS_CERT_PASSWORD` repository secrets, and warns loudly in the job
summary when they are absent. **What remains is a purchase, not code.**

Obtain an OV or EV code-signing certificate — the choice changes the workflow's
shape, so read [Release Signing](./release-signing.md#which-certificate) first —
add the two secrets, set `win.publisherName` to the certificate subject, and
re-verify SmartScreen behaviour on a machine that has never seen the app.

### 3. Update path

`src/main/autoUpdater.ts` calls `checkForUpdates()` five seconds after launch,
but `package.json` declares no `publish` target, so the check fails every time
and the error is swallowed. The renderer never listens for `updater:available`
or `updater:downloaded`, so even a successful check would tell the buyer nothing.

Choose one:

- **Ship updates** — add a `publish` provider, generate `latest.yml` in the
  release build, and surface both updater events in the interface.
- **Do not ship updates yet** — remove the `initAutoUpdater` call so early access
  makes no outbound request it cannot honour, and say in the store listing that
  updates are manual downloads.

The current middle state is the only unacceptable one.

### 4. Release automation — done

`.github/workflows/release.yml` runs on `v*` tags and on manual dispatch. It
installs with `npm ci`, refuses a tag that disagrees with `package.json`'s
version, runs `npm run typecheck` and `npm test -- --run`, packages for Windows
x64, and attaches `Citadel-<version>-setup.exe` and
`Citadel-<version>-portable.exe` to a **draft** GitHub Release. Signing (item 2)
plugs into the same workflow through repository secrets.

The draft is deliberate — publishing stays a human act, after the manual smoke
pass below. Full detail in [Release Signing](./release-signing.md).

Untested against GitHub's runners: the first tag push is the real proof, and
should be a throwaway version on a scratch tag rather than the first paid one.

### 5. First-run experience

A new buyer opens Citadel to an empty chamber and no instruction. Board templates
exist but are hidden behind the navigator, so the app looks like it does nothing.

The cheapest credible fix is a bundled sample archive — a small `.citadelz`
demonstrating relics, threads, sigils, and an inscription — opened automatically
on first launch, with a visible way to dismiss it and start empty. A guided
walkthrough can follow later; the sample archive alone changes the first
impression from "blank" to "this is what it is for."

### 6. Packaged-app smoke automation

`package.json` has an `e2e` script but no Playwright configuration or test files
are committed, so `npm run e2e` fails. Either commit a minimal
`@playwright/test` Electron suite that launches the packaged app, opens a
chamber, and seals a `.citadel`, or remove the script until one exists. Until
then the manual checklist below is the only packaging gate.

---

## Owner decisions carried from the notices audit

Neither is safe to resolve without the owner.

- **Cursor trade dress.** The bundled cursor set depicts *Old School RuneScape*
  weapons. The rw-designer licence covers the cursor author's work, not Jagex's
  underlying IP, and selling a product that ships them is a different exposure
  from giving it away. Options: keep and accept the risk, replace with original
  cursor art in the Citadel palette, or ship them disabled behind Fun Settings
  with the assets absent from the paid build.
- **Unattributed image assets.** `arcane-stone-canvas-tile.png`,
  `CitadelTower.png`, and `resources/icon.ico` have no provenance on record. If
  they are original work, say so in `THIRD_PARTY_NOTICES.md`. If they came from
  a stock or AI source, confirm that source's licence permits commercial
  redistribution inside a paid application.

---

## Platform scope

### Windows x64 — early access, now

The only supported target. `package.json` builds NSIS and portable x64, and
`resources/icon.ico` is present. Everything in this document is written for it.

### Linux — not in early access

The codebase is close to portable but the release is not. Nothing in the
renderer is Windows-specific, and the main process now builds paths through
`path` rather than assuming a separator, so the suite passes on Linux. What is
missing is release-side, not code-side:

- No `linux` target in the electron-builder config (AppImage and `.deb` would be
  the obvious pair).
- Settings, preview cache, and recovery resolve through `app.getPath('userData')`,
  which is correct on Linux but has never been exercised there in a packaged build.
- File associations for `.citadel` and `.citadelz` need a desktop entry and MIME
  registration, which the current config does not provide.
- No Linux machine is in the manual smoke loop.

Do not advertise Linux support, "coming soon" included, until a packaged
AppImage has passed the manual checklist below on a clean machine. Say
"Windows only" in the store listing.

### macOS — out of scope

Not targeted. It would additionally require Apple notarisation and a separate
signing identity.

---

## Manual smoke checklist

Run on a clean Windows machine — one that has never had a development build —
before publishing any paid artifact.

### Build gate

- [ ] `npm run typecheck` exits 0.
- [ ] `npm test -- --run` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `npm run package` exits 0 and `dist/` holds `Citadel-<version>-setup.exe` and `Citadel-<version>-portable.exe`.
- [ ] For a tagged build: the Actions run is green, the job summary reports the signing state expected, and the draft release holds both executables.

### Install and launch

- [ ] The NSIS installer completes and the installed app launches.
- [ ] The portable `.exe` launches without installation.
- [ ] SmartScreen behaviour is what signing (or the lack of it) predicts — no surprises.
- [ ] The app opens to a usable canvas with the toolbar and rail visible.
- [ ] The window title and taskbar icon read as Citadel, not Electron.

### The path a buyer walks

- [ ] Whatever first-run experience ships appears, and can be dismissed.
- [ ] Drag and drop an image onto the canvas; it renders.
- [ ] Add an inscription, a sigil, and a thread between two relics.
- [ ] Save a `.citadel`, close the app, reopen it, and load the file — everything is intact.
- [ ] Save a chamber holding a relic from outside the project folder; confirm `assets/` was created beside the `.citadel` and the reopened relic still renders.
- [ ] Export a `.citadelz`, then import it into a fresh project.
- [ ] Export a PDF and a PNG; open both outside Citadel.
- [ ] Undo and redo across a dozen operations.
- [ ] Record a session and play it back.
- [ ] Switch themes, including a custom palette, and confirm it survives a restart.
- [ ] Rebind a keybind and confirm it survives a restart.

### Trust and recovery

- [ ] Replacing a dirty project prompts an unsaved-change guard.
- [ ] Force-close with unsaved work; the next launch offers recovery.
- [ ] Open a deliberately corrupt `.citadel`; the app reports it and keeps the open chamber.
- [ ] Move a saved project folder to another drive and reopen it; relics still resolve.
- [ ] With the network disconnected, launch the app — the interface renders identically and nothing hangs.

### Offline and privacy

- [ ] No font or stylesheet request appears in DevTools' network panel on launch.
- [ ] The only outbound request on launch is the update check, and only if item 3 kept it.
- [ ] `%APPDATA%/Citadel` contains settings, caches, and recovery — and nothing unexpected.

### Media coverage (as sample files allow)

- [ ] GIF, video, audio, PDF, and 3D relics each import and play or render.
- [ ] A YouTube relic loads and is contained within its webview.

---

## Commercial clarity

Settle before the store listing, not after:

- The price, and what "early access" buys — which features are present now, which
  are promised, and what happens to the price at 1.0.
- Refund terms.
- A support address that a buyer can reach.
- Where updates come from (see item 3), and whether early-access buyers get 1.0.
- An explicit statement that Citadel is Windows-only today.

---

## Next steps after this release

- Signing certificate purchased and wired into the existing release workflow (item 2).
- Playwright suite against the packaged app (item 6), added as a job to that workflow.
- Linux packaging once the Windows loop is boring.
- Release-notes generation from tags.
