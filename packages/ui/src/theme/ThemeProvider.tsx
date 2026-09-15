'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'workspace-theme'
const ThemeContext = createContext<Readonly<{ theme: ThemeChoice; setTheme: (theme: ThemeChoice) => void }> | null>(
  null,
)

function applyTheme(theme: ThemeChoice) {
  const dark = theme === 'dark'
  const root = document.documentElement
  root.classList.add('theme-switching')
  root.classList.toggle('dark', dark)
  root.classList.remove('theme-switching')
}

/** Persistent light and dark theme switching with a system default (decision D-19). */
export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<ThemeChoice>('light')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const choice: ThemeChoice = saved === 'dark' ? 'dark' : 'light'
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
