import config from '@payload-config'
import '@ops/ui/globals.css'
import { ThemeProvider } from '@ops/ui'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { getPayload } from 'payload'
import { brandPresentation } from '../../server/branding/presentation'
import { tenantBrandDefaults } from '../../server/branding/tenant-defaults'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

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
            <section className="ops-auth-brand" aria-label={appName}>
              <div className="flex items-center gap-2">
                {/* Public brand route provides the configured favicon or a letter-tile fallback. */}
                <img
                  className="max-h-8 max-w-40 object-contain"
                  src={brand.logoUrl ?? brand.faviconUrl}
                  alt={appName}
                  width={160}
                  height={32}
                />
              </div>
              <div className="ops-auth-brand-copy max-w-[12rem]">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{appName}</p>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  CRM, projects, and team work in one place.
                </p>
              </div>
              <p className="mt-auto text-xs text-muted-foreground">Authorized access only</p>
            </section>
            <section className="ops-auth-panel">{children}</section>
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
