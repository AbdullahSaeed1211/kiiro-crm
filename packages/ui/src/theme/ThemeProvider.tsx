'use client'

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'workspace-theme'

const ThemeContext = createContext<Readonly<{ theme: ThemeChoice; setTheme: (theme: ThemeChoice) => void }> | null>(
  null,
)

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

// Storage can be blocked (private windows, site-data settings); the theme then lasts for the visit.
function readSaved(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function saveChoice(choice: ThemeChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Nothing to do: the choice is already applied.
  }
}

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

/** Persistent light, dark, and system theme switching with a light default. */
export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<ThemeChoice>('light')

  useLayoutEffect(() => {
    const saved = readSaved()
    const choice: ThemeChoice = saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'light'
    setThemeState(choice)
    applyTheme(choice)
  }, [])

  const setTheme = (choice: ThemeChoice) => {
    setThemeState(choice)
    saveChoice(choice)
    applyTheme(choice)
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === null) throw new Error('useTheme must be used within ThemeProvider.')
  return context
}
