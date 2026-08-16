import { defineConfig } from '@playwright/test'

/**
 * Electron is launched by the tests themselves, not through a browser
 * download. This makes the suite portable to a fresh Orca worktree after
 * `npm ci`, and avoids sharing a developer's Citadel profile.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
})
