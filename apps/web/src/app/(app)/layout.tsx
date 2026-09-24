import '@ops/ui/globals.css'
import { ThemeProvider } from '@ops/ui'
import { Toaster } from '@ops/ui/components/ui/sonner'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'
import type { Metadata } from 'next'
import { getProductContext, getWorkspaceSettings } from '../../server/auth/context'
import { AppFrame } from './app-frame'
import { normalizeLocale } from '../../i18n/config'
import { brandPresentation } from '../../server/branding/presentation'
import { tenantBrandDefaults } from '../../server/branding/tenant-defaults'
import { accessibleBrandColors } from '../../server/branding/accessible-colors'

// The vendored sidebar persists its open state in this cookie.
const SIDEBAR_COOKIE = 'sidebar_state'
const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWorkspaceSettings()
  const brand = brandPresentation({ ...settings, ...tenantBrandDefaults() })
  const appName = brand.appName
  return { title: { default: appName, template: `%s · ${appName}` } }
}

function settingsRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function textSetting(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function primaryThemeStyle(value: unknown): Record<string, string> {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) return {}
  const colors = accessibleBrandColors(value)
  return {
    '--primary': value,
    '--ring': value,
    '--primary-foreground': colors.foreground,
    '--primary-text-light': colors.textOnLight,
    '--primary-text-dark': colors.textOnDark,
  }
}

function themeStyle(settings: Record<string, unknown>): CSSProperties {
  const brand = settingsRecord(settings.brand)
  const radiusValue = brand.radius
  let radius: string | undefined
  if (radiusValue === 'sm') radius = '0.45rem'
  else if (radiusValue === 'lg') radius = '0.95rem'
  return {
    ...primaryThemeStyle(brand.primaryHex),
    ...(radius === undefined ? {} : { '--radius': radius }),
  } as CSSProperties
}

/** Root layout of the product UI with the application frame (spec §16). */
export default async function AppLayout({ children, modal }: Readonly<{ children: ReactNode; modal: ReactNode }>) {
  const [cookieStore, context, settings] = await Promise.all([cookies(), getProductContext(), getWorkspaceSettings()])
  const brand = brandPresentation({ ...settings, ...tenantBrandDefaults() })
  const appName = brand.appName
  const modulesValue = settingsRecord(settings.modules)
  const terminologyValue = settingsRecord(settings.terminology)
  const locale = normalizeLocale(settings.locale)
  const userName = textSetting(context.user.name, 'Team member')
  const userEmail = textSetting(context.user.email, '')
  const sidebarOpen = cookieStore.get(SIDEBAR_COOKIE)?.value !== 'false'
  return (
    <html lang={locale} suppressHydrationWarning className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
      <body style={themeStyle(settings)}>
        <ThemeProvider>
          <AppFrame
            defaultOpen={sidebarOpen}
            appName={appName}
            compactLogoUrl={brand.faviconUrl}
            modules={{
              crm: modulesValue.crm !== false,
              work: modulesValue.work !== false,
              intake: modulesValue.intake !== false,
              mail: modulesValue.mail !== false,
            }}
            terminology={terminologyValue}
            locale={locale}
            userName={userName}
            userEmail={userEmail}
            role={context.actor.role}
          >
            {children}
            {modal}
          </AppFrame>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
