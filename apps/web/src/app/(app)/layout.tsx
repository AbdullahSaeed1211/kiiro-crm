import '@ops/ui/globals.css'
import { ThemeProvider } from '@ops/ui'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

/** Root layout of the product UI; the application shell mounts inside it (spec §16). */
export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
