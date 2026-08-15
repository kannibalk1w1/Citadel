// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { MENU_HIDE_BELOW_PX, shouldHideMenuBar } from './MenuBarHover'

describe('menu bar hover', () => {
  it('keeps the menu up while the pointer is near the top of the window', () => {
    // Reaching up into the native menu leaves the web contents entirely, so the
    // renderer sees no events — hiding on leave would snatch it away mid-reach.
    expect(shouldHideMenuBar(0)).toBe(false)
    expect(shouldHideMenuBar(MENU_HIDE_BELOW_PX)).toBe(false)
  })

  it('puts the menu away once the pointer is back down in the canvas', () => {
    expect(shouldHideMenuBar(MENU_HIDE_BELOW_PX + 1)).toBe(true)
    expect(shouldHideMenuBar(400)).toBe(true)
  })
})
