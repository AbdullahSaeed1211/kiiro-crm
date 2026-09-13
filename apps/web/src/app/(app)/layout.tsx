import '@ops/ui/globals.css'
import { ThemeProvider } from '@ops/ui'
import { Toaster } from '@ops/ui/components/ui/sonner'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { AppFrame } from './app-frame'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

// The vendored sidebar persists its open state in this cookie.
const SIDEBAR_COOKIE = 'sidebar_state'

/** Root layout of the product UI with the application frame (spec §16). */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const sidebarOpen = (await cookies()).get(SIDEBAR_COOKIE)?.value !== 'false'
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
      <body>
        <ThemeProvider>
          <AppFrame defaultOpen={sidebarOpen}>{children}</AppFrame>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
