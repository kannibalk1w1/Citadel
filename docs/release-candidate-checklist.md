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

**One thing blocks a release now: the manual smoke pass on a clean Windows
machine.** The licence is settled (item 1), signing is optional under the itch
model (item 2), and the update path, release automation, first-run experience
and desktop automation are all done. Every asset that ships is now
original and generated from a source in the repository, and the
commercial-clarity questions below are answered.

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

### 1. Licence declaration — resolved

MIT, and staying MIT. Settled 2026-08-18 after weighing source-available
alternatives (PolyForm Noncommercial, Small Business, Perimeter; BUSL; FSL).

The deciding factor was the release model: Citadel goes out on itch.io at
name-your-price, self-building from source is explicitly fine by the author, and
a paid signed build is a later question if it ever takes off. A licence that
restricts commercial use would make working artists technically infringing to
protect revenue nobody is chasing, and would cost the "open source" label that
actually helps a niche creative tool get found.

Relicensing is reversible **forward**, so this is not a one-way door: everything
published up to a given commit stays MIT at those versions no matter what
happens later, and a future paid build can ship under different terms alongside
the signing certificate. What cannot be undone is the past — 72 unique sources
had already cloned the repo when this was decided, so the MIT grant on existing
versions is permanent regardless of any repository surgery.

`LICENSE` now names Kieran Beckenkrager as the holder, `package.json` carries
the same name in `author`, and `build.copyright` states it explicitly rather
than letting electron-builder derive a line from what used to be an empty field.
No email appears in either: a copyright line needs a holder, not a contact
route, and a support address is a separate decision under Commercial clarity.

**`"private": true` deliberately stays.** Earlier drafts of this checklist said
to drop it. That advice was wrong: it exists to block `npm publish`, which is
exactly what should never happen to an Electron application's source tree, and
it has no effect on electron-builder, on itch distribution, or on the licence
being coherently declared. The licence is declared by `LICENSE`, `license` and
`author` — all three now agree.

### 2. Code signing — optional, not blocking

Downgraded 2026-08-18 when the release model became itch.io at name-your-price.

Builds are unsigned, so SmartScreen warns on install and on the portable launch.
That is a serious problem for a paid download and an unremarkable one on itch,
where most of the catalogue is unsigned and the itch app handles delivery. Say
so on the listing and ship.

The workflow stays signing-ready: it passes `CSC_LINK` and `CSC_KEY_PASSWORD`
through to electron-builder from the `WINDOWS_CERT_BASE64` and
`WINDOWS_CERT_PASSWORD` secrets, and warns in the job summary when they are
absent. If Citadel ever justifies a paid build, buy an OV or EV certificate —
read [Release Signing](./release-signing.md#which-certificate) first, since the
choice changes the workflow's shape — add the two secrets, set
`win.publisherName` to the certificate subject, and re-verify SmartScreen on a
machine that has never seen the app.

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
- **Unattributed image assets — resolved 2026-08-18.** Nothing unattributed
  ships any more. `resources/icon.ico` and `icon.png` are generated from
  `resources/icon.svg` by `scripts/buildIcons.mjs` — the rail mascot redrawn as
  an app icon, original work in the app's palette. The other two are long gone.

---

## Platform scope

### Windows x64 — early access, now

The only supported target. `package.json` builds NSIS and portable x64, and
`resources/icon.ico` is present. Everything in this document is written for it.

### Linux — planned release alongside Windows

Promoted 2026-08-18. The whole suite, the Playwright desktop pass and the
accessibility pass all run on Linux, and a packaged AppImage now builds and
launches there.

Verified on 2026-08-18, on this machine, against `dist/Citadel-0.1.0.AppImage`:

- `npx electron-builder --linux` produces an **AppImage** (148 MB) and a
  **tar.gz** (140 MB).
- The desktop entry carries the icon, `Categories=Graphics`,
  `StartupWMClass=Citadel`, and `MimeType=application/x-citadel;application/x-citadelz;`.
- `usr/share/mime/citadel.xml` declares both types with `*.citadel` and
  `*.citadelz` globs — the MIME registration this section previously said was
  missing.
- The AppImage launches under a clean `HOME` on a virtual display, stays up, and
  logs nothing of substance.

**Deliberately no `.deb` or `.rpm`.** Both are fpm targets and refuse to build
without a maintainer email in `package.json`, and the author does not want a
personal address in published package metadata. AppImage plus tar.gz covers the
itch audience — run it anywhere, or unpack it yourself — with no inbox attached.

**Still unproven, and part of the manual pass rather than done:**

- Settings, preview cache and recovery under `app.getPath('userData')` in the
  *packaged* build. A clean launch writes nothing, which is correct — the app
  only writes when something changes — so this needs a human to change a
  setting, restart, and confirm it stuck.
- Whether the file associations actually register on a real desktop, which
  AppImage leaves to the user's integration tooling rather than doing itself.
  The tar.gz does not register anything at all.
- The manual checklist below, walked on Linux.

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
- [ ] `npx electron-builder --linux` exits 0 and `dist/` holds `Citadel-<version>.AppImage` and `citadel-<version>.tar.gz`.
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

## Commercial clarity — settled 2026-08-18

**Where it ships.** itch.io, at name-your-price. Windows and Linux.

**What the money buys.** Citadel in its current state. Name-your-price on itch
means the minimum is whatever is set, and a buyer can take the download without
paying — so this is a tip jar attached to a working tool, not a licence sale.
Nobody is buying permission: the source is MIT and building it yourself is
explicitly fine.

**What is promised.** Bug fixes on a reasonable cadence, and feature requests
taken and considered. Neither is a service-level commitment, and the listing
should say as much in plain words rather than implying a support contract.

**Refunds.** itch handles them in both payment modes — "itch.io will refund
payments on your behalf when necessary" — whether payments go direct to the
creator's Stripe/PayPal or are collected by itch. There is nothing to write, but
the listing should not promise terms that contradict itch's own handling.

**Support route.** itch imposes no requirement to publish a contact address.
GitHub Issues plus the itch page's comment thread covers it, and both are public
— which suits a project whose source is public anyway. No personal email
appears anywhere in the repository or the package metadata, and it should stay
that way; register a project address if one is ever genuinely needed.

**Updates.** Manual downloads. There is no update check in the app (item 3), and
itch's own app handles re-downloading for anyone who uses it. Say so on the
listing.

**Platforms.** Windows x64 and Linux x64. macOS remains out of scope: it needs
an Apple Developer account and notarisation, which is the same class of purchase
as Windows signing and buys less.

**One thing to decide before the page goes up.** itch distinguishes people who
paid — they get ownership and a download key — from people who took the free
download and get neither. That distinction only matters if Citadel ever moves to
a paid model, at which point the free downloaders have no claim. Worth knowing
now rather than discovering later.

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
