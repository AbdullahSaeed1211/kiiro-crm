'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from './locale'

const LocaleContext = createContext<Locale>('en')

/** Gives client components the workspace language, so each can read its own copy file without it being passed down. */
export function LocaleProvider({ locale, children }: Readonly<{ locale: Locale; children: ReactNode }>) {
  return <LocaleContext value={locale}>{children}</LocaleContext>
}

/** The workspace language. Use it with `catalogFor(SOME_COPY, useLocale())`. */
export function useLocale(): Locale {
  return useContext(LocaleContext)
}
