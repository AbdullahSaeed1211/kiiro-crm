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
import type { SettingsNavCopy } from '../../../i18n/settings-nav-copy'

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
      ['automation', '/settings/automation', Workflow, ['owner', 'manager']],
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

type Visible = readonly (readonly [string, readonly SettingsLink[]])[]

function NavLinkRow({ link, pathname, label }: Readonly<{ link: SettingsLink; pathname: string; label: string }>) {
  const [, href, Icon] = link
  const active = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-[background-color,color] hover:bg-muted hover:text-foreground ${active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
      href={href}
    >
      <Icon aria-hidden className="size-4" />
      <span>{label}</span>
    </Link>
  )
}

/** Every group the person may open, each with its heading; the same list serves the desktop column and the phone menu. */
function Groups({ groups, pathname, copy }: Readonly<{ groups: Visible; pathname: string; copy: SettingsNavCopy }>) {
  return (
    <div className="space-y-4">
      {groups.map(([groupKey, links]) => (
        <div key={groupKey} className="space-y-1">
          <h2 className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {copy.groupLabels[groupKey] ?? groupKey}
          </h2>
          {links.map((link) => (
            <NavLinkRow key={link[1]} link={link} pathname={pathname} label={copy.items[link[0]] ?? link[0]} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * The settings menu: every page the person may open, grouped, always visible beside the page on a wide screen. On a
 * phone the same list sits in one disclosure that names the open page, so it does not push the form out of view.
 */
export function SettingsNav({ role, locale }: Readonly<{ role: Role; locale: Locale }>) {
  const pathname = usePathname()
  const copy = SETTINGS_NAV_COPY[locale]
  const groups: Visible = GROUPS.map(
    ([groupKey, links]) => [groupKey, links.filter(([, , , roles]) => roles.includes(role))] as const,
  ).filter(([, links]) => links.length > 0)
  const activeKey =
    groups
      .flatMap(([, links]) => links)
      .find(([, href]) => pathname === href || pathname.startsWith(`${href}/`))?.[0] ?? 'general'
  return (
    <nav
      aria-label={copy.settings}
      className="md:sticky md:top-16 md:max-h-[calc(100svh-5rem)] md:self-start md:overflow-y-auto"
    >
      <div className="max-md:hidden">
        <Groups groups={groups} pathname={pathname} copy={copy} />
      </div>
      <details className="rounded-lg border px-2 py-2 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-1 py-1 text-sm font-medium marker:hidden">
          {copy.advanced}
          <span className="truncate font-normal text-muted-foreground">{copy.items[activeKey] ?? activeKey}</span>
        </summary>
        <div className="mt-3">
          <Groups groups={groups} pathname={pathname} copy={copy} />
        </div>
      </details>
    </nav>
  )
}
