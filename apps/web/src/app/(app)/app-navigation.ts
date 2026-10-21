import type { WorkProfile } from '@ops/platform'
import type { NavGroup } from '@ops/ui/composites/AppSidebar'
import {
  Building2,
  ChartNoAxesCombined,
  CircleCheckBig,
  Contact,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListTodo,
  Mail,
  PhoneCall,
  ReceiptText,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { SHELL_COPY, type Locale } from '../../i18n/config'

type NavLink = readonly [key: string, href: string, icon: LucideIcon]

const GENERAL: readonly NavLink[] = [
  ['dashboard', '/', LayoutDashboard],
  ['myTasks', '/my-tasks', CircleCheckBig],
]
const SALES_DESK: NavLink = ['salesWorkspace', '/sales', PhoneCall]
const CRM: readonly NavLink[] = [
  ['leads', '/leads', UserPlus],
  ['deals', '/deals', Handshake],
  ['organizations', '/organizations', Building2],
  ['contacts', '/contacts', Contact],
]
const STAFF_CRM: readonly NavLink[] = [CRM[2], CRM[3]]
const WORK: readonly NavLink[] = [
  ['projects', '/projects', FolderKanban],
  ['tasks', '/tasks', ListTodo],
]
const TASK_VIEW_PATHS = ['/calendar', '/timeline']

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/tasks' && TASK_VIEW_PATHS.some((path) => pathname.startsWith(path))) return true
  return pathname === href || pathname.startsWith(`${href}/`)
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

function generalGroup({
  role,
  workProfile,
  modules,
  item,
}: Readonly<{
  role: string
  workProfile: WorkProfile
  modules: Readonly<Record<string, boolean>>
  item: (link: NavLink) => NavGroup['items'][number]
}>): NavGroup {
  const isAdmin = isAdminRole(role)
  const showSalesDesk = modules.crm && (isAdmin || workProfile === 'sales')
  const links = showSalesDesk ? [SALES_DESK, ...GENERAL] : GENERAL
  const inbox: readonly NavLink[] = modules.mail && isAdmin ? [['inbox', '/inbox', Mail]] : []
  return { id: 'general', items: [...links, ...inbox].map(item) }
}

function workGroup({
  role,
  workProfile,
  enabled,
  label,
  item,
}: Readonly<{
  role: string
  workProfile: WorkProfile
  enabled: boolean
  label: string
  item: (link: NavLink) => NavGroup['items'][number]
}>): NavGroup | null {
  const isAdmin = isAdminRole(role)
  if (!enabled || (!isAdmin && workProfile === 'sales')) return null
  const adminLinks: readonly NavLink[] = [
    ['reports', '/reports', ChartNoAxesCombined],
    ['billing', '/billing', ReceiptText],
  ]
  const links = isAdmin ? [...WORK, ...adminLinks] : WORK
  return { id: 'work', label, items: links.map(item) }
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
  const groups: NavGroup[] = [generalGroup({ role, workProfile, modules, item })]
  if (modules.crm) {
    const crmLinks = isAdminRole(role) || workProfile === 'sales' ? CRM : STAFF_CRM
    groups.push({ id: 'crm', label: navLabel({ terminology, copy, key: 'crmGroup' }), items: crmLinks.map(item) })
  }
  const work = workGroup({
    role,
    workProfile,
    enabled: modules.work,
    label: navLabel({ terminology, copy, key: 'workGroup' }),
    item,
  })
  if (work !== null) groups.push(work)
  return groups
}

export function routeCopyKey(segment: string | undefined): string | undefined {
  if (segment === 'my-tasks') return 'myTasks'
  if (segment === 'sales') return 'salesWorkspace'
  return segment
}
