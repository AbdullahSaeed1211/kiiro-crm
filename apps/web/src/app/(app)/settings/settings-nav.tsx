'use client'

import type { Role } from '@ops/platform'
import { Bell, BriefcaseBusiness, Database, Mail, Palette, UserRound, UsersRound, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SETTINGS_COPY, SETTINGS_ITEM_COPY, type Locale } from '../../../i18n/config'

type SettingsLink = readonly [key: string, href: string, icon: LucideIcon, roles: readonly Role[]]
type SettingsGroup = readonly [key: string, links: readonly SettingsLink[]]
const GROUPS: readonly SettingsGroup[] = [
  [
    'workspace',
    [
      ['general', '/settings/general', BriefcaseBusiness, ['owner', 'manager']],
      ['branding', '/settings/branding', Palette, ['owner']],
      ['modules', '/settings/modules', BriefcaseBusiness, ['owner']],
      ['terminology', '/settings/terminology', BriefcaseBusiness, ['owner', 'manager']],
    ],
  ],
  [
    'people',
    [
      ['members', '/settings/members', UsersRound, ['owner', 'manager']],
      ['groups', '/settings/groups', UsersRound, ['owner', 'manager']],
    ],
  ],
  [
    'work',
    [
      ['workflows', '/settings/workflows', BriefcaseBusiness, ['owner', 'manager']],
      ['fields', '/settings/fields', Database, ['owner', 'manager']],
      ['views', '/settings/views', BriefcaseBusiness, ['owner', 'manager']],
    ],
  ],
  [
    'communications',
    [
      ['notifications', '/settings/notifications', Bell, ['owner', 'manager', 'staff']],
      ['email', '/settings/email', Mail, ['owner']],
      ['intake', '/settings/intake', Mail, ['owner', 'manager']],
    ],
  ],
  ['data', [['import', '/settings/import', Database, ['owner', 'manager']]]],
  ['personal', [['profile', '/settings/profile', UserRound, ['owner', 'manager', 'staff']]]],
]

export function SettingsNav({ role, locale }: Readonly<{ role: Role; locale: Locale }>) {
  const pathname = usePathname()
  const groupCopy = SETTINGS_COPY[locale]
  const itemCopy = SETTINGS_ITEM_COPY[locale]
  return (
    <nav aria-label={locale === 'es' ? 'Configuración' : 'Settings'} className="ops-settings-nav">
      {GROUPS.map(([groupKey, links]) => {
        const visible = links.filter(([, , , roles]) => roles.includes(role))
        if (visible.length === 0) return null
        return (
          <div key={groupKey} className="space-y-1">
            <h2 className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {groupCopy[groupKey] ?? groupKey}
            </h2>
            {visible.map(([key, href, Icon]) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-8 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-[background-color,color] hover:bg-muted hover:text-foreground ${active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
                  href={href}
                  key={href}
                >
                  <Icon aria-hidden className="size-4" />
                  <span>{itemCopy[key] ?? key}</span>
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}
