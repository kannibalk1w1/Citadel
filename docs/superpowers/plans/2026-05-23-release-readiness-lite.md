# Release Readiness Lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Citadel's local Windows alpha packaging path documented, verifiable, and free of obvious repo-owned packaging blockers.

**Architecture:** Keep release readiness local-first: Electron Builder remains configured from `package.json`, generated artifacts stay in `dist/`, and documentation becomes the main handoff surface. Add only repo-owned prerequisites or config changes needed for `npm run package`; do not add release automation, signing, or updater publishing.

**Tech Stack:** Electron Builder, electron-vite, npm scripts, Markdown documentation, PowerShell verification.

---

## File Structure

- Inspect: `package.json` for Electron Builder `build` settings and scripts.
- Inspect: `electron.vite.config.ts` for production build output assumptions.
- Inspect/possibly create: `resources/icon.ico` as the configured Windows app icon.
- Modify: `.gitignore` only if generated package artifacts are not ignored.
- Create: `docs/release-readiness-lite.md` as the release checklist and packaging guide.
- Modify: `README.md` to link the release readiness guide from the build/package section.

## Task 1: Packaging Prerequisite Audit

**Files:**
- Inspect: `package.json`
- Inspect: `electron.vite.config.ts`
- Inspect: `.gitignore`
- Inspect/Create if missing: `resources/icon.ico`

- [ ] **Step 1: Check packaging config and resource presence**

Run:

```powershell
Test-Path -LiteralPath '.\resources\icon.ico'
Get-Content -LiteralPath '.\package.json'
Get-Content -LiteralPath '.\electron.vite.config.ts'
Get-Content -LiteralPath '.\.gitignore'
```

Expected:

- `package.json` has `package`, `build.directories.output` set to `dist`, Windows `nsis` and `portable` targets, `.citadel` and `.citadelz` associations, and `win.icon` set to `resources/icon.ico`.
- `electron.vite.config.ts` uses default Electron Vite `out/` output.
- `.gitignore` ignores `dist/` and `out/`.
- `resources/icon.ico` exists. If it does not exist, continue to Step 2.

- [ ] **Step 2: Add a repo-owned icon only if missing**

If `resources/icon.ico` is missing, create the `resources/` directory and generate a simple Windows `.ico` from the existing `src/renderer/assets/CitadelTower.png` using a Node script with built-in modules plus an existing image library only if available. If no image conversion library is available locally, update `package.json` to remove the hard `win.icon` reference for this lite slice and document that custom icon work is a follow-up.

Preferred implementation if icon generation is possible:

```powershell
New-Item -ItemType Directory -Force -Path '.\resources'
```

Then create `resources/icon.ico` from the existing tower asset with a valid ICO containing common sizes: 16, 32, 48, and 256 px.

Expected: `Test-Path -LiteralPath '.\resources\icon.ico'` returns `True`.

- [ ] **Step 3: Adjust generated artifact ignores only if needed**

If `.gitignore` does not ignore generated package output, add:

```gitignore
dist/
out/
```

Expected: `dist/` and `out/` are ignored. Existing unrelated ignored entries stay unchanged.

## Task 2: Release Readiness Documentation

**Files:**
- Create: `docs/release-readiness-lite.md`

- [ ] **Step 1: Create the release guide**

Create `docs/release-readiness-lite.md` with this content:

```markdown
# Citadel Release Readiness Lite

This guide defines the local Windows alpha packaging path for Citadel. It is intentionally local-first: it covers building, packaging, and manually smoke-testing artifacts before adding signing, auto-update publishing, or GitHub release automation.

For feature coverage, see [Citadel Capabilities Guide](./citadel-capabilities-guide.md).

## Prerequisites

- Windows development machine.
- Node.js and npm installed.
- Project dependencies installed with `npm install`.
- Working tree reviewed so release artifacts do not include accidental source changes.

## Commands

Run these from the repository root:

```bash
npm.cmd run build
npm run typecheck
npm test -- --run
npm run package
```

`npm run package` runs `electron-vite build && electron-builder`.

## Expected Outputs

Electron Vite writes production app bundles to `out/`.

Electron Builder writes package artifacts to `dist/`. For the local alpha target, expect:

- An NSIS installer for x64 Windows.
- A portable `.exe` for x64 Windows.
- Generated metadata and unpacked app directories produced by Electron Builder.

Generated `out/` and `dist/` files are build artifacts and should not be committed.

## Manual Smoke Checklist

Required checks:

- [ ] `npm.cmd run build` exits 0.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm test -- --run` exits 0.
- [ ] `npm run package` exits 0.
- [ ] `dist/` contains an installer and portable executable.
- [ ] Portable executable launches Citadel.
- [ ] App opens to a usable canvas with toolbar and sidebar visible.
- [ ] New project works.
- [ ] Drag/drop one image onto the canvas.
- [ ] Save a `.citadel` project.
- [ ] Reopen the saved `.citadel` project.
- [ ] Export an image or PDF.
- [ ] Open key panels: Boards, Assets, Keybinds/Search.
- [ ] Dirty project replacement shows an unsaved-change guard.

Optional checks:

- [ ] Run the NSIS installer and launch the installed app.
- [ ] Export a `.citadelz` archive.
- [ ] Import the `.citadelz` archive.
- [ ] Simulate recovery by closing with unsaved work and relaunching.
- [ ] Check recent projects after saving/opening.
- [ ] Smoke test audio, video, YouTube, PDF, and 3D item imports when sample files are available.

## Known Alpha Limitations

- Builds are unsigned unless code signing is added later.
- GitHub release automation is not part of this slice.
- Auto-update publishing is not part of this slice.
- Manual smoke testing is required before sharing artifacts.
- Packaged artifact names are controlled by Electron Builder defaults unless customized later.

## Troubleshooting

Missing icon:

- The package config expects `resources/icon.ico` for Windows builds. If packaging fails because the icon is missing, add the icon to the repo or explicitly remove the icon reference for that build.

Network or download failures:

- Electron Builder may need cached Electron or builder dependencies. Re-run after network access is restored, or pre-populate the relevant caches.

Locked output files:

- Close running Citadel packaged builds before packaging again.
- Delete generated `dist/` only after confirming it contains no hand-authored files.

Antivirus or SmartScreen warnings:

- Unsigned local alpha builds may produce warnings on Windows. Signing is a future release-readiness step.

## Next Release-Readiness Steps

- Add GitHub Actions for tagged release builds.
- Add release notes generation.
- Decide on code signing strategy.
- Decide whether to publish auto-update metadata.
- Add packaged-app smoke automation once the local package path is stable.
```

Expected: the doc exists, has required and optional smoke sections, names `out/` and `dist/`, and links to the capabilities guide.

## Task 3: README Release Link

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add package command and guide link**

In README's `Getting started` section, add `npm run package` and a release guide sentence:

```markdown
npm run package   # Production build + Windows installer/portable artifacts
```

Below the command block add:

```markdown
For local alpha packaging and smoke testing, see [Citadel Release Readiness Lite](docs/release-readiness-lite.md).
```

Expected: README points contributors to the release guide without duplicating the full checklist.

## Task 4: Packaging Verification

**Files:**
- Generated only: `out/`, `dist/`

- [ ] **Step 1: Run build**

Run:

```bash
npm.cmd run build
```

Expected: exit 0.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Run tests**

Run:

```bash
npm test -- --run
```

Expected: exit 0.

- [ ] **Step 4: Run package**

Run:

```bash
npm run package
```

Expected: exit 0 and `dist/` contains Windows package artifacts. If packaging fails because of a repo-owned config issue, fix it and rerun. If packaging fails because of an environmental issue such as network/cache access, capture the important failure text for the final report.

- [ ] **Step 5: Inspect artifacts**

Run:

```powershell
Get-ChildItem -LiteralPath '.\dist' -Force
```

Expected: includes an NSIS installer and a portable `.exe`, or the final report documents why packaging could not produce them.

- [ ] **Step 6: Check diff hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; generated `out/` and `dist/` files do not appear as tracked changes.

## Task 5: Commit Release Readiness Lite

**Files:**
- Add/Modify only the relevant source docs/config/resource files.

- [ ] **Step 1: Review diff**

Run:

```bash
git diff --stat
git diff -- README.md docs/release-readiness-lite.md package.json .gitignore
```

If `resources/icon.ico` was created, confirm it is staged intentionally.

Expected: changes are limited to release readiness docs and any packaging prerequisite fix.

- [ ] **Step 2: Commit**

Run:

```bash
git add README.md docs/release-readiness-lite.md
git add resources/icon.ico
git add package.json .gitignore
git commit -m "docs: add release readiness lite guide"
```

Only run `git add` for files that actually changed or were created.

Expected: commit succeeds.
