import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
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
} from '@ops/ui/components/ui/sidebar'

/** One sidebar link (spec §16.2); the label arrives translated. */
export type NavItem = Readonly<{
  label: string
  href: string
  icon: LucideIcon
  /** Marks the current section; the app decides by exact or prefix route match. */
  active?: boolean
  /** Count or marker at the end of the row, hidden while the sidebar is collapsed. */
  badge?: ReactNode
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

function BrandMark({ appName, logo, compactLogo }: Readonly<{ appName: string; logo: ReactNode; compactLogo?: ReactNode }>) {
  if (logo !== undefined && logo !== null) {
    return (
      <>
        <span className="flex size-8 shrink-0 items-center justify-center group-data-[collapsible=icon]:hidden">{logo}</span>
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

function NavLink({ item }: Readonly<{ item: NavItem }>) {
  const Icon = item.icon
  const active = item.active ?? false
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        render={<a href={item.href} aria-current={active ? 'page' : undefined} />}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
      {item.badge === undefined ? null : <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
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

/** Inset sidebar that collapses to icons (spec §16.1–§16.2): brand header, navigation groups and an optional footer. */
export function AppSidebar({ appName, logo, compactLogo, homeHref = '/', groups, footer }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon" className="ops-app-sidebar">
      <SidebarHeader className="ops-sidebar-brand">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={appName} render={<a href={homeHref} />}>
              <BrandMark appName={appName} logo={logo} compactLogo={compactLogo} />
              <span className="font-semibold">{appName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <NavSection key={group.id} group={group} />
        ))}
      </SidebarContent>
      {footer === undefined ? null : <SidebarFooter>{footer}</SidebarFooter>}
    </Sidebar>
  )
}
