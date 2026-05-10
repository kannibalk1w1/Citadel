import React, { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <>{children}</>
}
