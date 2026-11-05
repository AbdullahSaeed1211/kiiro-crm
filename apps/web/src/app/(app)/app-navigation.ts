import type { WorkProfile } from '@ops/platform'
import type { NavGroup } from '@ops/ui/composites/AppSidebar'
import {
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CircleCheckBig,
  Clock,
  Contact,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListTodo,
  Mail,
  PhoneCall,
  ReceiptText,
  Repeat2,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { SHELL_COPY, type Locale } from '../../i18n/config'

/** One place a person can go: the sidebar, the command menu and the `g` shortcuts all read this list. */
export type NavLink = Readonly<{ key: string; href: string; icon: LucideIcon; shortcut?: string }>

const TODAY: readonly NavLink[] = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard, shortcut: 'd' },
  { key: 'attendance', href: '/attendance', icon: Clock, shortcut: 'a' },
]
const MY_TASKS = { key: 'myTasks', href: '/my-tasks', icon: CircleCheckBig, shortcut: 'm' }
const SALES_DESK = { key: 'salesWorkspace', href: '/sales', icon: PhoneCall, shortcut: 'w' }
const SALES: readonly NavLink[] = [
  { key: 'leads', href: '/leads', icon: UserPlus, shortcut: 'l' },
  { key: 'deals', href: '/deals', icon: Handshake, shortcut: 'e' },
]
const CLIENTS: readonly NavLink[] = [
  { key: 'organizations', href: '/organizations', icon: Building2, shortcut: 'o' },
  { key: 'contacts', href: '/contacts', icon: Contact, shortcut: 'k' },
]
const WORK: readonly NavLink[] = [
  { key: 'tasks', href: '/tasks', icon: ListTodo, shortcut: 't' },
  { key: 'projects', href: '/projects', icon: FolderKanban, shortcut: 'p' },
  { key: 'calendar', href: '/calendar', icon: CalendarDays, shortcut: 'c' },
  { key: 'contentCalendar', href: '/content-calendar', icon: FileText },
  { key: 'repeatingTasks', href: '/tasks/repeating', icon: Repeat2 },
]
const TEAM = { key: 'teamAssignments', href: '/team', icon: Users, shortcut: 'u' }

/** Who is looking, and what the workspace has switched on. */
export type NavViewer = Readonly<{
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  role: string
  workProfile: WorkProfile
  locale: Locale
}>

/** A link ready to show: translated, with the keys that reach it. */
export type NavEntry = Readonly<{ key: string; href: string; icon: LucideIcon; label: string; shortcut?: string }>
export type NavSection = Readonly<{ id: string; label?: string; entries: readonly NavEntry[] }>

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/tasks') return isTaskRouteActive(pathname)
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isTaskRouteActive(pathname: string): boolean {
  // Calendar has its own link; repeating tasks have their own entry. Timeline
  // remains a task view even though it has no separate top-level navigation.
  return pathname.startsWith('/timeline') || (pathname.startsWith('/tasks') && !pathname.startsWith('/tasks/repeating'))
}

const isAdminRole = (role: string): boolean => role === 'owner' || role === 'manager'

function termLabel(viewer: NavViewer, key: string): string {
  const value = viewer.terminology[key]
  return typeof value === 'string' && value !== '' ? value : (SHELL_COPY[viewer.locale][key] ?? key)
}

function clientGroupLabel(viewer: NavViewer): string {
  const clients = viewer.terminology.clientsGroup
  if (typeof clients === 'string' && clients !== '') return clients
  // Existing workspaces customize the organization term; keep it for the group
  // heading while using the new customer-facing default in other workspaces.
  const organizations = viewer.terminology.organizations
  return typeof organizations === 'string' && organizations !== ''
    ? organizations
    : SHELL_COPY[viewer.locale].clientsGroup
}

const REPORTS: NavLink = { key: 'reports', href: '/reports', icon: ChartNoAxesCombined, shortcut: 'r' }
const INBOX: NavLink = { key: 'inbox', href: '/inbox', icon: Mail, shortcut: 'i' }
const BILLING: NavLink = { key: 'billing', href: '/billing', icon: ReceiptText, shortcut: 'b' }

function workLinks(viewer: NavViewer): readonly NavLink[] {
  const admin = isAdminRole(viewer.role)
  if (viewer.workProfile === 'sales' && !admin) return [MY_TASKS]
  return [MY_TASKS, ...WORK, ...(admin ? [TEAM] : [])]
}

const only = (condition: boolean, links: readonly NavLink[]): readonly NavLink[] => (condition ? links : [])

/** The groups as plain link lists; roles and switched-off modules are decided here and nowhere else. */
function sectionLinks(
  viewer: NavViewer,
): readonly Readonly<{ id: string; label?: string; links: readonly NavLink[] }>[] {
  const { modules, role, workProfile } = viewer
  const admin = isAdminRole(role)
  const tools = [...only(modules.work, [REPORTS]), ...only(modules.mail, [INBOX]), ...only(modules.work, [BILLING])]
  const groups = [
    { id: 'today', links: modules.work ? TODAY : [...TODAY, MY_TASKS] },
    { id: 'work', label: termLabel(viewer, 'workGroup'), links: only(modules.work, workLinks(viewer)) },
    { id: 'clients', label: clientGroupLabel(viewer), links: only(modules.crm, CLIENTS) },
    {
      id: 'sales',
      label: termLabel(viewer, 'salesGroup'),
      links: only(modules.crm && (admin || workProfile === 'sales'), [SALES_DESK, ...SALES]),
    },
    { id: 'utilities', label: termLabel(viewer, 'utilitiesGroup'), links: only(admin, tools) },
  ]
  return groups.filter((group) => group.links.length > 0)
}

/** Every group the viewer may see, in order, with translated labels. */
export function navSections(viewer: NavViewer): NavSection[] {
  return sectionLinks(viewer).map(({ id, label, links }) => ({
    id,
    label,
    entries: links.map((item) => ({ ...item, label: termLabel(viewer, item.key) })),
  }))
}

/** Everything the viewer can go to, flat: what the command menu lists and the `g` shortcuts reach. */
export const navEntries = (sections: readonly NavSection[]): NavEntry[] => sections.flatMap((item) => item.entries)

/** The sidebar's view of the model: the current page marked, and a count where one applies. */
export function navGroups({
  sections,
  pathname,
  counts,
  countLabels,
}: Readonly<{
  sections: readonly NavSection[]
  pathname: string
  counts: Readonly<Partial<Record<string, number>>>
  countLabels: Readonly<Partial<Record<string, (count: number) => string>>>
}>): NavGroup[] {
  return sections.map((item) => ({
    id: item.id,
    label: item.label,
    items: item.entries.map((nav) => {
      const count = counts[nav.key] ?? 0
      return {
        label: nav.label,
        href: nav.href,
        icon: nav.icon,
        active: isNavActive(pathname, nav.href),
        shortcut: nav.shortcut === undefined ? undefined : `G ${nav.shortcut.toUpperCase()}`,
        ...(count > 0
          ? {
              badge: count > 99 ? '99+' : count,
              badgeTone: 'alert' as const,
              badgeLabel: countLabels[nav.key]?.(count),
            }
          : {}),
      }
    }),
  }))
}

/** What the "New" menu and the command menu's Create group offer, by module. */
export function createLinks(viewer: NavViewer): readonly Readonly<{ key: string; href: string; icon: LucideIcon }>[] {
  const { modules } = viewer
  return [
    ...(modules.work ? [{ key: 'newTask', href: '/tasks/new', icon: ListTodo }] : []),
    ...(modules.work ? [{ key: 'newProject', href: '/projects/new', icon: FolderKanban }] : []),
    // Leads belong to the sales desk, so they are offered wherever the Leads link is.
    ...(modules.crm && (isAdminRole(viewer.role) || viewer.workProfile === 'sales')
      ? [{ key: 'newLead', href: '/leads/new', icon: UserPlus }]
      : []),
    ...(modules.crm
      ? [
          { key: 'newContact', href: '/contacts/new', icon: Contact },
          { key: 'newOrganization', href: '/organizations/new', icon: Building2 },
        ]
      : []),
  ]
}

export function routeCopyKey(segment: string | undefined): string | undefined {
  if (segment === 'my-tasks') return 'myTasks'
  if (segment === 'sales') return 'salesWorkspace'
  if (segment === 'content-calendar') return 'contentCalendar'
  if (segment === 'repeating') return 'repeatingTasks'
  return segment
}
