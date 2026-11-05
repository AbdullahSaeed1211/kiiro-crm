'use client'

import { useTheme, type ThemeChoice } from '@ops/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { SidebarMenuButton } from '@ops/ui/components/ui/sidebar'
import { ChevronsUpDown, Keyboard, LogOut, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { SEARCH_COPY, SHELL_COPY, type Locale } from '../../i18n/config'
import { NAV_COPY } from '../../i18n/nav-copy'

async function logOut() {
  try {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    window.location.assign('/login')
  }
}

/** One row in the sidebar footer that opens everything personal: profile, settings, theme, shortcuts and sign-out. */
export function AccountMenu({
  name,
  email,
  role,
  locale,
  onShowShortcuts,
}: Readonly<{ name: string; email: string; role: string; locale: Locale; onShowShortcuts: () => void }>) {
  const { theme, setTheme } = useTheme()
  const shell = SHELL_COPY[locale]
  const copy = NAV_COPY[locale]
  const settingsHref = role === 'staff' ? '/settings/profile' : '/settings/general'
  const themes: readonly (readonly [ThemeChoice, string])[] = [
    ['light', copy.light],
    ['dark', copy.dark],
    ['system', copy.system],
  ]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" aria-label={copy.account} className="h-12 data-popup-open:bg-sidebar-accent" />
        }
      >
        <span className="ops-brand-mark grid size-8 shrink-0 place-items-center text-xs font-semibold text-primary-foreground">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block truncate text-xs font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{email || role}</span>
        </span>
        <ChevronsUpDown aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/settings/profile" prefetch={false} />}>
            <User aria-hidden />
            {copy.profile}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={settingsHref} prefetch={false} />}>
            <Settings aria-hidden />
            {shell.settings}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShowShortcuts}>
            <Keyboard aria-hidden />
            {SEARCH_COPY[locale].showShortcuts}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{copy.theme}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              setTheme(value as ThemeChoice)
            }}
          >
            {themes.map(([choice, label]) => (
              <DropdownMenuRadioItem key={choice} value={choice}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void logOut()
          }}
        >
          <LogOut aria-hidden />
          {shell.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
