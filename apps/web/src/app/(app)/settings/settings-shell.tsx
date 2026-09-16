import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { ReactNode } from 'react'
import type { Role } from '@ops/platform'
import { getWorkspaceSettings, requireRole } from '../../../server/auth/context'
import { SettingsNav } from './settings-nav'
import { normalizeLocale } from '../../../i18n/config'

export async function SettingsPage({
  title,
  description,
  roles,
  children,
}: Readonly<{ title: string; description: string; roles: readonly Role[]; children?: ReactNode }>) {
  const context = await requireRole(...roles)
  const settings = await getWorkspaceSettings()
  const locale = normalizeLocale(settings.locale)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Settings' }, { label: title }]} />
      <PageContent>
        <div className="grid w-full gap-8 md:grid-cols-[14rem_minmax(0,1fr)]">
          <SettingsNav role={context.actor.role} locale={locale} />
          <section className="min-w-0 max-w-3xl space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            {children ?? (
              <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
                No settings configured yet.
              </div>
            )}
          </section>
        </div>
      </PageContent>
    </>
  )
}

export function SettingsForm({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="ops-settings-form space-y-4 rounded-xl border bg-background p-6 shadow-sm">{children}</div>
}

export function SettingRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input className="h-10 rounded-md border bg-background px-3" defaultValue={value} />
    </label>
  )
}
