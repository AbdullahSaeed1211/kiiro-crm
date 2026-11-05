import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from '@ops/ui/components/ui/sidebar'

/** One sidebar link (spec §16.2); the label arrives translated. */
export type NavItem = Readonly<{
  label: string
  href: string
  icon: LucideIcon
  /** Marks the current section; the app decides by exact or prefix route match. */
  active?: boolean
  /** Count at the end of the row, hidden while the sidebar is collapsed (a dot replaces it). It takes no layout space. */
  badge?: ReactNode
  /** `alert` marks a count that needs attention, such as overdue work. */
  badgeTone?: 'default' | 'alert'
  /** Plain-language reading of the badge for screen readers, such as "3 overdue". */
  badgeLabel?: string
  /** Keys that reach this page from the keyboard, shown in the tooltip, such as "G T". */
  shortcut?: string
}>

/** A run of sidebar links with an optional group label. */
export type NavGroup = Readonly<{
  id: string
  label?: string
  items: readonly NavItem[]
}>

/** Props of {@link AppSidebar}. */
export type AppSidebarProps = Readonly<{
  appName: string
  /** Logo element sized 24 px; without one, a letter tile from `appName` is shown. */
  logo?: ReactNode
  /** Compact mark shown when the sidebar collapses to icon width. */
  compactLogo?: ReactNode
  homeHref?: string
  groups: readonly NavGroup[]
  /** Footer content such as settings and the user menu. */
  footer?: ReactNode
}>

function BrandMark({
  appName,
  logo,
  compactLogo,
}: Readonly<{ appName: string; logo: ReactNode; compactLogo?: ReactNode }>) {
  if (logo !== undefined && logo !== null) {
    return (
      <>
        <span className="flex size-8 shrink-0 items-center justify-center group-data-[collapsible=icon]:hidden">
          {logo}
        </span>
        <span className="hidden size-8 shrink-0 items-center justify-center group-data-[collapsible=icon]:flex">
          {compactLogo ?? logo}
        </span>
      </>
    )
  }
  return (
    <span className="ops-brand-mark flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
      {appName.charAt(0).toUpperCase()}
    </span>
  )
}

function NavTooltip({ item }: Readonly<{ item: NavItem }>) {
  if (item.shortcut === undefined) return <>{item.label}</>
  return (
    <span className="flex items-center gap-2">
      {item.label}
      <kbd className="rounded border border-background/30 px-1 font-sans text-[10px] opacity-80">{item.shortcut}</kbd>
    </span>
  )
}

/** The count beside a link. It is positioned over the row, so it never changes the row's size. */
function NavBadge({ item }: Readonly<{ item: NavItem }>) {
  const alert = item.badgeTone === 'alert'
  return (
    <>
      <SidebarMenuBadge
        aria-hidden
        className={alert ? 'bg-destructive/10 text-destructive peer-data-active/menu-button:text-destructive' : ''}
      >
        {item.badge}
      </SidebarMenuBadge>
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1 right-1 hidden size-2 rounded-full group-data-[collapsible=icon]:block ${alert ? 'bg-destructive' : 'bg-primary'}`}
      />
    </>
  )
}

function NavLink({ item }: Readonly<{ item: NavItem }>) {
  const Icon = item.icon
  const active = item.active ?? false
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={{ children: <NavTooltip item={item} /> }}
        render={<Link href={item.href} prefetch={false} aria-current={active ? 'page' : undefined} />}
      >
        <Icon />
        <span>{item.label}</span>
        {item.badgeLabel === undefined ? null : <span className="sr-only">{item.badgeLabel}</span>}
      </SidebarMenuButton>
      {item.badge === undefined ? null : <NavBadge item={item} />}
    </SidebarMenuItem>
  )
}

function NavSection({ group }: Readonly<{ group: NavGroup }>) {
  return (
    <SidebarGroup>
      {group.label === undefined ? null : <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** Inset sidebar that collapses to icons (spec §16.1–§16.2): brand header, navigation groups, rail and optional footer. */
export function AppSidebar({ appName, logo, compactLogo, homeHref = '/', groups, footer }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon" className="ops-app-sidebar">
      <SidebarHeader className="ops-sidebar-brand">
        <div className="flex min-w-0 items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={appName} render={<Link href={homeHref} prefetch={false} />}>
                <BrandMark appName={appName} logo={logo} compactLogo={compactLogo} />
                <span className="font-semibold">{appName}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="hidden shrink-0 md:flex group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <NavSection key={group.id} group={group} />
        ))}
      </SidebarContent>
      {footer === undefined ? null : <SidebarFooter>{footer}</SidebarFooter>}
      <SidebarRail />
    </Sidebar>
  )
}
