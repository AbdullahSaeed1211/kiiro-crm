'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { SEARCH_COPY, type Locale } from '../../i18n/config'
import { NAV_COPY } from '../../i18n/nav-copy'
import type { createLinks } from './app-navigation'

/** The header's one "New" control: every record the viewer can start, from any page. */
export function CreateMenu({ links, locale }: Readonly<{ links: ReturnType<typeof createLinks>; locale: Locale }>) {
  if (links.length === 0) return null
  const label = NAV_COPY[locale].create
  const copy = SEARCH_COPY[locale]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label={label} />}>
        <Plus aria-hidden />
        <span className="hidden lg:inline">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {links.map(({ key, href, icon: Icon }) => (
          <DropdownMenuItem key={href} render={<Link href={href} prefetch={false} />}>
            <Icon aria-hidden />
            {copy[key]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
