import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Citadel is offline-first and says so in its README, so an outbound request on
 * launch is a claim as much as a feature.
 *
 * The updater used to run five seconds after every launch against a build with
 * no `publish` target, so it could only fail — and nothing in the renderer
 * listened for its events either way. It is now dormant by decision, not by
 * accident, and re-enabling it needs a publish feed, renderer handling and a
 * signing certificate. This guards the source rather than behaviour because the
 * thing worth catching is someone re-adding the call.
 */
const mainSource = readFileSync(join(process.cwd(), 'src', 'main', 'index.ts'), 'utf-8')

describe('the auto-updater stays dormant', () => {
  it('is not started on launch', () => {
    expect(mainSource).not.toContain('initAutoUpdater')
  })

  it('makes no other launch-time update call', () => {
    expect(mainSource).not.toContain('checkForUpdates')
    expect(mainSource).not.toContain('electron-updater')
  })

  it('has no publish feed to check against, which is why it is off', () => {
    // If a publish target is ever added, this test should be the thing that
    // makes someone finish the other two steps rather than only the easy one.
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))

    expect(pkg.build.publish).toBeUndefined()
  })
})
