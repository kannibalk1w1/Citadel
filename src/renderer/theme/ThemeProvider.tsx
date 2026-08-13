import React, { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

const overrideVariables = {
  canvas: '--bg-canvas',
  ui: '--bg-ui',
  panel: '--bg-panel',
  text: '--text-primary',
  accent: '--accent',
} as const

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const theme = useUIStore((s) => s.theme)
  const themeOverrides = useUIStore((s) => s.themeOverrides)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    for (const [key, variable] of Object.entries(overrideVariables)) {
      const value = themeOverrides[key as keyof typeof overrideVariables]
      if (value) document.documentElement.style.setProperty(variable, value)
      else document.documentElement.style.removeProperty(variable)
    }
  }, [theme, themeOverrides])

  return <>{children}</>
}
