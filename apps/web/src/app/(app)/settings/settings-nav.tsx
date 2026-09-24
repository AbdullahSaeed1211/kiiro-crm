'use client'

import type { Role } from '@ops/platform'
import { Bell, BriefcaseBusiness, Database, Mail, Palette, UserRound, UsersRound, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SETTINGS_COPY, SETTINGS_ITEM_COPY, type Locale } from '../../../i18n/config'
import styles from './settings-nav.module.css'

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
  const router = useRouter()
  const groupCopy = SETTINGS_COPY[locale]
  const itemCopy = SETTINGS_ITEM_COPY[locale]
  const visibleGroups = GROUPS.map(
    ([groupKey, links]) => [groupKey, links.filter(([, , , roles]) => roles.includes(role))] as const,
  ).filter(([, links]) => links.length > 0)
  const visibleLinks = visibleGroups.flatMap(([, links]) => links)
  const activeHref = (visibleLinks.find(([, href]) => pathname === href || pathname.startsWith(`${href}/`)) ??
    visibleLinks[0])[1]
  return (
    <nav
      aria-label={locale === 'es' ? 'Configuración' : 'Settings'}
      className={`${styles.navigation} ops-settings-nav`}
    >
      <label className={styles.picker}>
        <span className="sr-only">{locale === 'es' ? 'Sección de configuración' : 'Settings section'}</span>
        <select
          aria-label={locale === 'es' ? 'Sección de configuración' : 'Settings section'}
          className={styles.select}
          onChange={(event) => {
            router.push(event.currentTarget.value)
          }}
          value={activeHref}
        >
          {visibleGroups.map(([groupKey, links]) => (
            <optgroup key={groupKey} label={groupCopy[groupKey] ?? groupKey}>
              {links.map(([key, href]) => (
                <option key={href} value={href}>
                  {itemCopy[key] ?? key}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {visibleGroups.map(([groupKey, visible]) => (
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
      ))}
    </nav>
  )
}
