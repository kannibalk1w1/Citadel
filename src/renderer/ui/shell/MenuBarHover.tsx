import React, { useEffect, useRef } from 'react'

// The native menu bar is hidden (autoHideMenuBar). This strip along the very top
// of the window reveals it on hover and puts it away once the pointer comes back
// down into the canvas.
//
// Hiding is driven by pointer depth rather than by leaving the strip: once the
// menu bar is showing, the pointer moving up into it leaves the web contents
// entirely and the renderer stops receiving events. Hiding on leave would
// therefore snatch the menu away exactly as someone reached for it.

export const MENU_HOVER_STRIP_PX = 5

// Far enough below the menu bar that crossing back into the canvas is a
// deliberate movement, not a twitch.
export const MENU_HIDE_BELOW_PX = 56

export function shouldHideMenuBar(pointerY: number): boolean {
  return pointerY > MENU_HIDE_BELOW_PX
}

function setMenuBarVisible(visible: boolean): void {
  const ipc = (window as unknown as { ipc?: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
  ipc?.invoke('window:setMenuBarVisible', { visible }).catch(() => {})
}

export function MenuBarHover(): React.ReactElement {
  const visible = useRef(false)

  const show = (): void => {
    if (visible.current) return
    visible.current = true
    setMenuBarVisible(true)
  }

  useEffect(() => {
    const hideIfDeep = (event: MouseEvent): void => {
      if (!visible.current) return
      if (!shouldHideMenuBar(event.clientY)) return
      visible.current = false
      setMenuBarVisible(false)
    }
    const hideOnBlur = (): void => {
      if (!visible.current) return
      visible.current = false
      setMenuBarVisible(false)
    }

    window.addEventListener('mousemove', hideIfDeep)
    window.addEventListener('blur', hideOnBlur)
    return () => {
      window.removeEventListener('mousemove', hideIfDeep)
      window.removeEventListener('blur', hideOnBlur)
    }
  }, [])

  return (
    <div
      onMouseEnter={show}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: MENU_HOVER_STRIP_PX,
        zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
        pointerEvents: 'auto',
      }}
    />
  )
}
