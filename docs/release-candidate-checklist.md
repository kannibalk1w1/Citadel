# Citadel Release-Candidate Checklist

The state of Citadel as a paid early-access release, and what still stands between
the current build and one a buyer can be charged for.

This is the commercial-readiness document. [Release Readiness Lite](./release-readiness-lite.md)
remains the mechanical how-to for building and packaging a local Windows alpha;
this file says whether the result is fit to sell. For how the build compares to
Ref Flow — the product a buyer will price it against — see
[Citadel vs Ref Flow](./citadel-vs-refflow.md).

**Scope of the first release: Windows x64 only.** Everything below is written
against that. Linux and macOS are addressed in [Platform scope](#platform-scope).

Last reviewed: 2026-08-16.

---

## Verdict

Not yet shippable as a paid build, but what remains is almost entirely yours to
decide rather than ours to build.

The archive itself is in good order — the save/open path is covered by tests,
the `.citadelz` rites are hardened, and the interface makes no outbound request
at all now. Release automation drafts a release from a tag (item 4), the
first-run guide ships with a guided example project (item 5), and desktop and
accessibility automation run against the built app (item 6). The update path is
settled: there is no update check, and updates are manual downloads (item 3).

**Three things block a paid build, and two of them are purchases or decisions
rather than code:** naming a licence holder (item 1), buying a signing
certificate (item 2), and walking the manual smoke pass below on a clean
Windows machine. One asset — `resources/icon.ico` — still has no provenance.

Last reviewed against the code on 2026-08-18.

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
- **Third-party notices.** Audited 2026-08-17; see `THIRD_PARTY_NOTICES.md`. No cursor art, mascot art or canvas texture ships any more.
- **Crash recovery.** Dirty work is written to a recovery snapshot and offered
  back on the next launch.
- **Test suite.** `npm test -- --run` is fully green on Linux and Windows.
- **Typecheck.** `npm run typecheck` is green *and real* as of 2026-08-15. It
  previously ran `tsc --noEmit` against a root config of `"files": []`, which
  checked nothing and always exited 0; the build gate below was a false green
  for as long as it existed. It now runs `tsc --build` across both projects.
- **First run.** A non-modal Getting started guide appears for a fresh profile
  and can be dismissed without blocking normal work, and it opens a bundled
  example project that demonstrates every item type, connection meaning and
  review tool the app has.
- **No launch-time network use.** The auto-updater is dormant by decision and
  guarded by `src/main/autoUpdater.test.ts`, so a launch with the network
  disconnected is indistinguishable from one without.
- **Desktop and accessibility automation.** `npm run e2e` launches the built
  Electron app with a temporary profile; `npm run a11y` audits onboarding and
  the command palette in that real app window. See [Testing Citadel](./testing.md).

---

## Blocking work

Ordered by how much each one costs a buyer's trust.

### 1. Licence declaration

`LICENSE` now exists and carries the MIT text, matching `README.md`, `AGENTS.md`,
and `package.json`. Two things in it are still placeholders:

- Its copyright line reads "Citadel contributors" rather than the holder's legal
  name, which is what a licence has to name to be enforceable.
- `package.json` still sets `"private": true` with an empty `author`.

**The remaining decision is the owner's, not an engineering one.** MIT source
plus a paid binary is a legitimate model, but it means a buyer may rebuild and
redistribute the app for free, and it cannot be walked back once published.
Decide, then act:

- If MIT stands — replace the placeholder copyright holder with a legal name and
  year, fill in `package.json`'s `author`, and drop `"private"`.
- If the release is to be source-available or proprietary — replace `LICENSE`,
  and correct `README.md` and `AGENTS.md` before any public tag.

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

### 3. Update path — resolved, updates are manual

Resolved 2026-08-18 by removing the check rather than by building a feed.

`initAutoUpdater` used to run five seconds after every launch against a build
with no `publish` target, so it could only fail, and the renderer listened for
neither `updater:available` nor `updater:downloaded` — the middle state this
checklist called the only unacceptable one. `src/main/index.ts` no longer calls
it, and `src/main/autoUpdater.test.ts` fails if that call comes back.

Removal rather than a feed because shipping updates depends on two things that
are not settled: whether release binaries are public at all (item 1), and
signing (item 2) — an unsigned auto-update is a warning dialog on every install.

**The store listing must say updates are manual downloads.** Re-enabling later
is three steps, not one, and they are written at the top of
`src/main/autoUpdater.ts`: a publish provider, renderer handling for both
events, and a certificate.

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

### 5. First-run experience — done

A fresh profile opens a small, non-modal Getting started guide covering boards,
importing, notes and code, connecting items, the Index, reviewing work, and safe
overlay controls. It can be dismissed immediately and never blocks opening an
existing project.

The bundled example is no longer a hypothetical: `examples/showcase.citadel`
ships as an extraResource and is one click from the guide. Five boards carrying
every item type, every connection meaning, all ten code languages, source
captures anchored to image regions, comment pins, bookmarks and board moods,
each with a note saying what it is — and a last board left empty. It opens
without adopting its own path, so saving asks where to put the user's copy and
the shipped original stays intact.

It is generated by `scripts/buildShowcase.mjs` rather than hand-kept, and
`src/renderer/utils/showcase.test.ts` fails if it stops covering what the app
declares it can do. Its media is synthesised by ffmpeg and inlined as data URIs,
so it carries no third-party licence and has no assets to lose.

### 6. Desktop smoke automation — done

`npm run e2e` builds Citadel, launches that built Electron app with an isolated
temporary profile, and covers the first-run guide, the command palette, palette
extraction, source captures and their editable image regions, study sessions,
the time machine, and the vision checks — twelve specs, last run green on
2026-08-18. `npm run a11y` uses axe-core in the Electron window to guard the
onboarding and command-palette surfaces. This does not replace a manual test of
the installer or OS-native dialogs; it makes regressions in ordinary desktop
flows visible before that pass. The portable setup is documented in
[Testing Citadel](./testing.md).

---

## Owner decisions carried from the notices audit

- **Cursor trade dress — resolved 2026-08-18.** No cursor artwork ships in
  Citadel at all; the app uses the operating system's pointers. Cursor art is
  distributed as a separate `.citadel-cursors.json` pack the user imports from
  Fun Settings, so the *Old School RuneScape* exposure no longer touches a
  product sold for money. Whoever publishes that pack still owns the call, and
  `THIRD_PARTY_NOTICES.md` carries its attribution.
- **Unattributed image assets — one left.** `arcane-stone-canvas-tile.png` and
  `CitadelTower.png` no longer ship: the canvas moved to a procedural dot grid
  and the mascot was removed. **`resources/icon.ico` still has no provenance on
  record and ships in every build.** If it is original work, say so in
  `THIRD_PARTY_NOTICES.md`. If it came from a stock or AI source, confirm that
  licence permits commercial redistribution inside a paid application.

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
- [ ] `npm run e2e` exits 0.
- [ ] `npm run a11y` exits 0.
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
- [ ] Add a code card, connect it to something, save, reopen — the snippet and
      its thread are both still there. (This is the one that failed silently:
      `code` was missing from the save schema's accepted types, so every code
      card and every connection touching one was discarded on load.)
- [ ] Save a `.citadel`, close the app, reopen it, and load the file — everything is intact.
- [ ] Save a chamber holding a relic from outside the project folder; confirm `assets/` was created beside the `.citadel` and the reopened relic still renders.
- [ ] Export a `.citadelz`, then import it into a fresh project.
- [ ] Export a PDF and a PNG; open both outside Citadel.
- [ ] Undo and redo across a dozen operations.
- [ ] Record a session and play it back.
- [ ] Switch themes, including a custom palette, and confirm it survives a restart.
- [ ] Rebind a keybind and confirm it survives a restart.
- [ ] Zoom in and out from the keyboard, and check the View menu's shortcuts
      match what the keybind panel lists. (Ctrl+− was dead in both places at
      once: the resolver held it under a spelling no keypress produced, and the
      menu offered Electron a key name it rejects.)

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
- **Plugins — shelved to post-release, 2026-08-18.** The scaffolding under
  `src/renderer/plugins` is inert and is no longer claimed as a feature
  anywhere. Making it real means a loader, contribution points, and a trust
  model for third-party code in a renderer that holds the IPC bridge — none of
  which blocks a paid build. Until then, anything that needs to ship separately
  uses a data file, as cursor packs and theme palettes do.
