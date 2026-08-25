# Testing Citadel from any Orca worktree

Citadel's automated checks are repository-local. A fresh Orca instance only
needs a supported Node.js installation and this checkout; it does not need a
globally installed browser, Playwright browser download, personal Citadel
profile, or paths from another machine.

```bash
npm ci
npm run typecheck
npx vitest run
npm run e2e
npm run a11y
npm run analyze
```

`npm run e2e` and `npm run a11y` build Citadel first, then launch the Electron
binary declared in `package.json`. Each test gets a temporary `--user-data-dir`
that is removed afterwards. Real Citadel settings, projects, recent-file lists,
and keybind overrides are never read or changed.

The Electron suite starts deliberately small: it protects a true first run,
the command-palette shortcut, and automated accessibility checks for onboarding
and the palette. Add high-value desktop regressions here as features become
stable. Native operating-system dialogs remain outside Playwright's control;
test their renderer request and main-process IPC separately, then include them
in the manual packaged-app pass.

Electron cases use the `.e2e.ts` suffix rather than Vitest's `.test.ts` or
`.spec.ts` suffix. That keeps `npx vitest run` limited to unit/component tests
while `npm run e2e` runs only real desktop cases.

`npm run analyze` produces `reports/bundle-stats.html`. It is an ignored local
report, so it can be opened in any browser without changing source control.
Use it before deciding where to code-split or optimise; do not add production
dependencies based only on bundle size.

## The transcription engine test

Transcription is covered by ordinary unit tests that drive a stub child process,
which proves the contract around the recogniser but not the recogniser's own
flags, JSON shape, or progress format. Those belong to whisper.cpp and can
change under us, so one test runs the real binary and is skipped unless it is
pointed at one:

```bash
CITADEL_WHISPER_BIN=/path/to/whisper-cli \
CITADEL_WHISPER_MODEL=/path/to/ggml-tiny.en-q5_1.bin \
CITADEL_WHISPER_WAV=/path/to/whisper.cpp/samples/jfk.wav \
npx vitest run src/main/transcriptionEngine.integration.test.ts
```

`npm run engine` puts a binary in `resources/whisper/` to point the first
variable at, and Settings downloads a model for the second. The wav must be
16 kHz mono 16-bit, which is what the renderer's decoder produces and what the
samples in the whisper.cpp repo already are. Run it after any change to the
engine arguments, and when moving to a new pinned release.

## Known environment requirement

Electron tests need a graphical desktop session. This is normally present in
Orca desktop workspaces. A truly headless Linux runner must provide a virtual
display (for example Xvfb); that is a runner concern, not a Citadel setup step.
