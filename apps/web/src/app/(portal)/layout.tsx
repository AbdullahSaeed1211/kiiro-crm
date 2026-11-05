import '@ops/ui/globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { LocaleProvider } from '../../i18n/locale-context'
import { themeStyle } from '../../server/branding/theme-style'
import { loadPortalWorkspace } from '../../server/billing/portal-page'
import { FONT_CLASS } from '../fonts'

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await loadPortalWorkspace()
  return {
    title: { default: brand.appName, template: `%s · ${brand.appName}` },
    icons: brand.faviconUrl,
    // The address holds the client's token: keep it out of search engines and out of the Referer header.
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

/** The client portal shell: the tenant's brand, no sidebar and no staff session. */
export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { brand, locale, settings } = await loadPortalWorkspace()
  return (
    <html lang={locale} className={FONT_CLASS}>
      <body style={themeStyle(settings)} className="min-h-svh bg-muted/40">
        <LocaleProvider locale={locale}>
          <header className="border-b bg-background">
            <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-2 px-4">
              {brand.logoUrl === null ? (
                <span className="text-sm font-semibold">{brand.appName}</span>
              ) : (
                <img src={brand.logoUrl} alt={brand.appName} className="h-7 w-auto" />
              )}
            </div>
          </header>
          <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6 md:py-10">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  )
}
