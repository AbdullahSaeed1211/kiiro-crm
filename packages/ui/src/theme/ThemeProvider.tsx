'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'workspace-theme'

/**
 * Runs in the page head, before first paint, so a dark theme never flashes light while the app loads. A saved choice
 * wins; with none saved the system setting decides (decision D-19). Keep it in step with `ThemeProvider` below.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`
const ThemeContext = createContext<Readonly<{ theme: ThemeChoice; setTheme: (theme: ThemeChoice) => void }> | null>(
  null,
)

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

// Colours change with transitions off for one frame, so the page does not animate between themes.
function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement
  root.classList.add('theme-switching')
  root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && prefersDark()))
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove('theme-switching')
    })
  })
}

/** Persistent light and dark theme switching with a system default (decision D-19). */
export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<ThemeChoice>('light')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    // With no saved choice the system decides, but the state holds the theme in effect so the switch shows the right icon.
    const system: ThemeChoice = prefersDark() ? 'dark' : 'light'
    const choice: ThemeChoice = saved === 'dark' || saved === 'light' ? saved : system
    setThemeState(choice)
    applyTheme(choice)
  }, [])

  const setTheme = (choice: ThemeChoice) => {
    setThemeState(choice)
    if (choice === 'system') window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, choice)
    applyTheme(choice)
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === null) throw new Error('useTheme must be used within ThemeProvider.')
  return context
}
