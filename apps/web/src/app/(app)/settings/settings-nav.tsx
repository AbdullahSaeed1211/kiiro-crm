'use client'

import type { Role } from '@ops/platform'
import {
  Activity,
  Archive,
  Bell,
  Building2,
  Database,
  FileInput,
  Languages,
  LayoutGrid,
  ListChecks,
  ListOrdered,
  Mail,
  Megaphone,
  Palette,
  Puzzle,
  TrendingUp,
  UserRound,
  UsersRound,
  Webhook,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SETTINGS_NAV_COPY } from '../../../i18n/settings-nav-copy'
import type { Locale } from '../../../i18n/locale'

type SettingsLink = readonly [key: string, href: string, icon: LucideIcon, roles: readonly Role[]]
type SettingsGroup = readonly [key: string, links: readonly SettingsLink[]]
const GROUPS: readonly SettingsGroup[] = [
  [
    'workspace',
    [
      ['general', '/settings/general', Building2, ['owner', 'manager']],
      ['branding', '/settings/branding', Palette, ['owner']],
      ['modules', '/settings/modules', Puzzle, ['owner']],
      ['terminology', '/settings/terminology', Languages, ['owner', 'manager']],
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
      ['workflows', '/settings/workflows', Workflow, ['owner', 'manager']],
      ['fields', '/settings/fields', Database, ['owner', 'manager']],
      ['playbooks', '/settings/playbooks', ListChecks, ['owner', 'manager']],
      ['views', '/settings/views', LayoutGrid, ['owner', 'manager']],
      ['lists', '/settings/lists', ListOrdered, ['owner', 'manager']],
    ],
  ],
  [
    'communications',
    [
      ['notifications', '/settings/notifications', Bell, ['owner', 'manager', 'staff']],
      ['email', '/settings/email', Mail, ['owner']],
      ['newsletter', '/settings/newsletter', Megaphone, ['owner', 'manager']],
      ['sales', '/settings/sales', TrendingUp, ['owner', 'manager']],
      ['intake', '/settings/intake', FileInput, ['owner', 'manager']],
    ],
  ],
  [
    'data',
    [
      ['import', '/settings/import', Database, ['owner', 'manager']],
      ['archive', '/settings/archive', Archive, ['owner', 'manager']],
      ['activity', '/settings/activity', Activity, ['owner', 'manager']],
      ['webhooks', '/settings/webhooks', Webhook, ['owner']],
    ],
  ],
  ['personal', [['profile', '/settings/profile', UserRound, ['owner', 'manager', 'staff']]]],
]

export function SettingsNav({ role, locale }: Readonly<{ role: Role; locale: Locale }>) {
  const pathname = usePathname()
  const copy = SETTINGS_NAV_COPY[locale]
  const visibleGroups = GROUPS.map(
    ([groupKey, links]) => [groupKey, links.filter(([, , , roles]) => roles.includes(role))] as const,
  ).filter(([, links]) => links.length > 0)
  const visibleLinks = visibleGroups.flatMap(([, links]) => links)
  const activeKey =
    visibleLinks.find(([, href]) => pathname === href || pathname.startsWith(`${href}/`))?.[0] ?? 'general'
  const commonKeys = role === 'staff' ? ['profile', 'notifications'] : ['general', 'members', 'profile']
  const commonLinks = commonKeys.flatMap((key) => visibleLinks.filter(([linkKey]) => linkKey === key))
  return (
    <nav aria-label={copy.settings} className="space-y-5">
      <div className="space-y-1">
        <h2 className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {copy.common}
        </h2>
        {commonLinks.map(([key, href, Icon]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-[background-color,color] hover:bg-muted hover:text-foreground ${active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
              href={href}
              key={href}
            >
              <Icon aria-hidden className="size-4" />
              <span>{copy.items[key] ?? key}</span>
            </Link>
          )
        })}
      </div>
      <details className="group rounded-lg border px-2 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground marker:hidden hover:text-foreground">
          {copy.advanced}
          {!commonKeys.includes(activeKey) ? (
            <span className="truncate font-normal text-foreground">{copy.items[activeKey] ?? activeKey}</span>
          ) : null}
        </summary>
        <div className="mt-3 space-y-4">
          {visibleGroups.map(([groupKey, links]) => {
            const advancedLinks = links.filter(([key]) => !commonKeys.includes(key))
            if (advancedLinks.length === 0) return null
            return (
              <div key={groupKey} className="space-y-1">
                <h2 className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {copy.groupLabels[groupKey] ?? groupKey}
                </h2>
                {advancedLinks.map(([key, href, Icon]) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <Link
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-[background-color,color] hover:bg-muted hover:text-foreground ${active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
                      href={href}
                      key={href}
                    >
                      <Icon aria-hidden className="size-4" />
                      <span>{copy.items[key] ?? key}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </details>
    </nav>
  )
}
