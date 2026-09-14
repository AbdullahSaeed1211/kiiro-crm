import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Role } from '@ops/platform'
import { requireRole } from '../../../server/auth/context'

const LINKS = [
  ['General', '/settings/general'],
  ['Branding', '/settings/branding'],
  ['Modules', '/settings/modules'],
  ['Terminology', '/settings/terminology'],
  ['Members', '/settings/members'],
  ['Groups', '/settings/groups'],
  ['Workflows', '/settings/workflows'],
  ['Fields', '/settings/fields'],
  ['Views', '/settings/views'],
  ['Notifications', '/settings/notifications'],
  ['Import', '/settings/import'],
  ['Profile', '/settings/profile'],
] as const

export async function SettingsPage({
  title,
  description,
  roles,
  children,
}: Readonly<{ title: string; description: string; roles: readonly Role[]; children?: ReactNode }>) {
  await requireRole(...roles)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Settings' }, { label: title }]} />
      <PageContent>
        <div className="grid w-full gap-8 md:grid-cols-[13rem_1fr]">
          <nav aria-label="Settings" className="space-y-1">
            {LINKS.map(([label, href]) => (
              <Link
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
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
  return <div className="space-y-4 rounded-xl border bg-background p-6 shadow-sm">{children}</div>
}

export function SettingRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input className="h-10 rounded-md border bg-background px-3" defaultValue={value} />
    </label>
  )
}
