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

## Known environment requirement

Electron tests need a graphical desktop session. This is normally present in
Orca desktop workspaces. A truly headless Linux runner must provide a virtual
display (for example Xvfb); that is a runner concern, not a Citadel setup step.
