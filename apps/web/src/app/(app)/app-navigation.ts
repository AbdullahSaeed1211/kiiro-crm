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
  type LucideIcon,
} from 'lucide-react'
import { SHELL_COPY, type Locale } from '../../i18n/config'

type NavLink = readonly [key: string, href: string, icon: LucideIcon]

const TODAY: readonly NavLink[] = [
  ['dashboard', '/', LayoutDashboard],
  ['attendance', '/attendance', Clock],
]
const MY_TASKS: NavLink = ['myTasks', '/my-tasks', CircleCheckBig]
const SALES_DESK: NavLink = ['salesWorkspace', '/sales', PhoneCall]
const SALES: readonly NavLink[] = [
  ['leads', '/leads', UserPlus],
  ['deals', '/deals', Handshake],
]
const CLIENTS: readonly NavLink[] = [
  ['organizations', '/organizations', Building2],
  ['contacts', '/contacts', Contact],
]
const WORK: readonly NavLink[] = [
  ['tasks', '/tasks', ListTodo],
  ['projects', '/projects', FolderKanban],
  ['calendar', '/calendar', CalendarDays],
  ['contentCalendar', '/content-calendar', FileText],
  ['repeatingTasks', '/tasks/repeating', Repeat2],
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/tasks') return isTaskRouteActive(pathname)
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isTaskRouteActive(pathname: string): boolean {
  // Calendar has its own link; repeating tasks have their own entry. Timeline
  // remains a task view even though it has no separate top-level navigation.
  return pathname.startsWith('/timeline') || (pathname.startsWith('/tasks') && !pathname.startsWith('/tasks/repeating'))
}

function isAdminRole(role: string): boolean {
  return role === 'owner' || role === 'manager'
}

function navLabel({
  terminology,
  copy,
  key,
}: Readonly<{
  terminology: Readonly<Record<string, unknown>>
  copy: Readonly<Record<string, string>>
  key: string
}>) {
  const value = terminology[key]
  return typeof value === 'string' && value !== '' ? value : (copy[key] ?? key)
}

function clientGroupLabel({
  terminology,
  copy,
}: Readonly<{
  terminology: Readonly<Record<string, unknown>>
  copy: Readonly<Record<string, string>>
}>): string {
  const clients = terminology.clientsGroup
  if (typeof clients === 'string' && clients !== '') return clients
  // Existing workspaces customize the organization term; keep it for the group
  // heading while using the new customer-facing default in other workspaces.
  const organizations = terminology.organizations
  return typeof organizations === 'string' && organizations !== '' ? organizations : copy.clientsGroup
}

function createNavItem({
  pathname,
  terminology,
  copy,
}: Readonly<{
  pathname: string
  terminology: Readonly<Record<string, unknown>>
  copy: Readonly<Record<string, string>>
}>): (link: NavLink) => NavGroup['items'][number] {
  return ([key, href, icon]) => ({
    label: navLabel({ terminology, copy, key }),
    href,
    icon,
    active: isActive(pathname, href),
  })
}

function todayAndWorkGroups({
  modules,
  role,
  workProfile,
  terminology,
  copy,
  item,
}: Readonly<{
  modules: Readonly<Record<string, boolean>>
  role: string
  workProfile: WorkProfile
  terminology: Readonly<Record<string, unknown>>
  copy: Readonly<Record<string, string>>
  item: (link: NavLink) => NavGroup['items'][number]
}>): NavGroup[] {
  const groups: NavGroup[] = [{ id: 'today', items: TODAY.map(item) }]
  if (!modules.work) return [{ ...groups[0], items: [...TODAY, MY_TASKS].map(item) }]

  const workLinks = workProfile === 'sales' && !isAdminRole(role) ? [MY_TASKS] : [MY_TASKS, ...WORK]
  groups.push({ id: 'work', label: navLabel({ terminology, copy, key: 'workGroup' }), items: workLinks.map(item) })
  return groups
}

function clientAndSalesGroups({
  modules,
  terminology,
  copy,
  role,
  workProfile,
  item,
}: Readonly<{
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  copy: Readonly<Record<string, string>>
  role: string
  workProfile: WorkProfile
  item: (link: NavLink) => NavGroup['items'][number]
}>): NavGroup[] {
  if (!modules.crm) return []
  const groups: NavGroup[] = [
    { id: 'clients', label: clientGroupLabel({ terminology, copy }), items: CLIENTS.map(item) },
  ]
  if (isAdminRole(role) || workProfile === 'sales') {
    groups.push({
      id: 'sales',
      label: navLabel({ terminology, copy, key: 'salesGroup' }),
      items: [SALES_DESK, ...SALES].map(item),
    })
  }
  return groups
}

function adminUtilityGroups({
  modules,
  role,
  terminology,
  copy,
  item,
}: Readonly<{
  modules: Readonly<Record<string, boolean>>
  role: string
  terminology: Readonly<Record<string, unknown>>
  copy: Readonly<Record<string, string>>
  item: (link: NavLink) => NavGroup['items'][number]
}>): NavGroup[] {
  if (!isAdminRole(role)) return []
  const groups: NavGroup[] = []
  if (modules.work) groups.push({ id: 'reports', items: [item(['reports', '/reports', ChartNoAxesCombined])] })

  const utilities: readonly NavLink[] = [
    ...(modules.mail ? ([['inbox', '/inbox', Mail]] as const) : []),
    ...(modules.work ? ([['billing', '/billing', ReceiptText]] as const) : []),
  ]
  if (utilities.length > 0) {
    groups.push({
      id: 'utilities',
      label: navLabel({ terminology, copy, key: 'utilitiesGroup' }),
      items: utilities.map(item),
    })
  }
  return groups
}

export function navGroups({
  pathname,
  modules,
  terminology,
  role,
  workProfile,
  locale,
}: Readonly<{
  pathname: string
  modules: Readonly<Record<string, boolean>>
  terminology: Readonly<Record<string, unknown>>
  role: string
  workProfile: WorkProfile
  locale: Locale
}>): NavGroup[] {
  const copy = SHELL_COPY[locale]
  const item = createNavItem({ pathname, terminology, copy })
  return [
    ...todayAndWorkGroups({ modules, role, workProfile, terminology, copy, item }),
    ...clientAndSalesGroups({ modules, terminology, copy, role, workProfile, item }),
    ...adminUtilityGroups({ modules, role, terminology, copy, item }),
  ]
}

export function routeCopyKey(segment: string | undefined): string | undefined {
  if (segment === 'my-tasks') return 'myTasks'
  if (segment === 'sales') return 'salesWorkspace'
  if (segment === 'content-calendar') return 'contentCalendar'
  if (segment === 'repeating') return 'repeatingTasks'
  return segment
}
