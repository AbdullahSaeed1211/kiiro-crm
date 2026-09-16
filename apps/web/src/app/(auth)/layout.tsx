import config from '@payload-config'
import '@ops/ui/globals.css'
import { ThemeProvider } from '@ops/ui'
import { Geist, Geist_Mono } from 'next/font/google'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getPayload } from 'payload'
import { brandPresentation } from '../../server/branding/presentation'
import { tenantBrandDefaults } from '../../server/branding/tenant-defaults'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Sign in',
  icons: { icon: '/api/v1/brand/favicon' },
}

export default async function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  const payload = await getPayload({ config })
  const settings = (await payload.findGlobal({ slug: 'settings', depth: 0 })) as unknown as Record<string, unknown>
  const brand = brandPresentation({ ...settings, ...tenantBrandDefaults() })
  const appName = brand.appName
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
      <body>
        <ThemeProvider>
          <main className="ops-auth-shell">
            <section className="ops-auth-panel">
              <div className="ops-auth-stack">
                <img
                  className="ops-auth-logo"
                  src={brand.logoUrl ?? brand.faviconUrl}
                  alt={appName}
                  width={192}
                  height={40}
                />
                {children}
                <p className="text-center text-xs text-muted-foreground">Authorized access only</p>
              </div>
            </section>
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
