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
