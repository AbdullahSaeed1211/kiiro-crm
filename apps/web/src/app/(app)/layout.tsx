import '@ops/ui/globals.css'
import { ThemeProvider } from '@ops/ui'
import { Toaster } from '@ops/ui/components/ui/sonner'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'
import type { Metadata } from 'next'
import { getProductContext } from '../../server/auth/context'
import { AppFrame } from './app-frame'
import { normalizeLocale } from '../../i18n/config'

// The vendored sidebar persists its open state in this cookie.
const SIDEBAR_COOKIE = 'sidebar_state'
const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export async function generateMetadata(): Promise<Metadata> {
  const context = await getProductContext()
  const settings = (await context.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    req: context.req,
  })) as unknown as Record<string, unknown>
  const appName = textSetting(settings.appName, 'Workspace')
  return { title: { default: appName, template: `%s · ${appName}` } }
}

function settingsRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function textSetting(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function themeStyle(settings: Record<string, unknown>): CSSProperties {
  const brand = settingsRecord(settings.brand)
  const primaryValue = brand.primaryHex
  const primary = typeof primaryValue === 'string' && /^#[\da-f]{6}$/i.test(primaryValue) ? primaryValue : undefined
  const radiusValue = brand.radius
  let radius: string | undefined
  if (radiusValue === 'sm') radius = '0.45rem'
  else if (radiusValue === 'lg') radius = '0.95rem'
  return {
    ...(primary === undefined ? {} : { '--primary': primary, '--ring': primary }),
    ...(radius === undefined ? {} : { '--radius': radius }),
  } as CSSProperties
}

/** Root layout of the product UI with the application frame (spec §16). */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [cookieStore, context] = await Promise.all([cookies(), getProductContext()])
  const settings = (await context.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })) as unknown as Record<string, unknown>
  const appName = textSetting(settings.appName, 'Workspace')
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
            logoFileKey={
              typeof settings.logoFileKey === 'string' && settings.logoFileKey.startsWith('brand/')
                ? settings.logoFileKey
                : null
            }
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
          </AppFrame>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
