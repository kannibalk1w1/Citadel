import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Holding a key used to make the canvas flash and show the desktop through it.
 *
 * Two separate faults met on the space bar, which is the key most likely to be
 * held down because it is the pan gesture:
 *
 *   1. Nothing filtered keyboard auto-repeat, so a held key called into the
 *      HyperType engine about thirty times a second. Each call restarted the
 *      shake animation, so the canvas never sat still.
 *   2. The shake translates `.citadel-shell-canvas` by a few pixels. On Linux
 *      the host window, `html` and `body` are all transparent, because
 *      Electron's window opacity is a no-op there and the app draws its own
 *      alpha instead. `#root` painted nothing itself, so sliding the canvas
 *      opened a strip of bare desktop at the window edge.
 *
 * Both are guarded here rather than through App.tsx, which cannot be rendered
 * in a unit test, in the same style as the auto-updater guard: what is worth
 * catching is someone removing the fix.
 */

const root = join(process.cwd(), 'src', 'renderer')
const appSource = readFileSync(join(root, 'App.tsx'), 'utf-8')
const darkCss = readFileSync(join(root, 'theme', 'dark.css'), 'utf-8')

describe('a held key is one keystroke', () => {
  it('does not send auto-repeat into the HyperType engine', () => {
    const call = appSource.slice(
      appSource.indexOf('const onKeyDown'),
      appSource.indexOf('engine.keyStroke') + 40,
    )

    expect(call).toContain('e.repeat')
    expect(call).toMatch(/if \(!e\.repeat\) engine\.keyStroke/)
  })

  it('still lets a held key repeat an action, which is a real thing to want', () => {
    const handler = appSource.slice(appSource.indexOf('const onKeyDown'), appSource.indexOf('resolver.resolve(e)'))

    // The repeat check guards the flourish only. A `return` on repeat would
    // take the keybind resolver with it.
    expect(handler).not.toMatch(/if \(e\.repeat\) return/)
  })
})

describe('nothing shows through the app', () => {
  const ruleStart = darkCss.indexOf("html[data-window-opacity-fallback='true'] #root")
  const fallbackRootRule = darkCss.slice(ruleStart, darkCss.indexOf('}', ruleStart))

  it('paints the app background on the one element that never moves', () => {
    // body is transparent under this fallback, so if #root paints nothing then
    // any gap a transform opens is a hole through to the desktop.
    expect(fallbackRootRule).toContain('background: var(--bg-canvas)')
  })

  it('keeps that fill under the window opacity, so the setting still works', () => {
    expect(fallbackRootRule).toContain('opacity: var(--window-overlay-opacity, 1)')
    expect(fallbackRootRule.indexOf('opacity:')).toBeLessThan(fallbackRootRule.indexOf('background:'))
  })

  it('leaves body transparent, which is what the alpha is drawn against', () => {
    expect(darkCss).toMatch(/html\[data-window-opacity-fallback='true'\] body \{\s*background: transparent;/)
  })
})

describe('the shake itself', () => {
  const overlay = readFileSync(join(root, 'arcade', 'HyperTypeOverlay.tsx'), 'utf-8')

  it('stays small enough that the fill behind it covers the gap', () => {
    const offsets = [...overlay.matchAll(/translate\((-?\d+)px,\s*(-?\d+)px\)/g)]
      .flatMap((match) => [Math.abs(Number(match[1])), Math.abs(Number(match[2]))])

    expect(offsets.length).toBeGreaterThan(0)
    // A shake big enough to slide past the window would be visible as a jump
    // whatever paints behind it.
    expect(Math.max(...offsets)).toBeLessThanOrEqual(8)
  })
})
