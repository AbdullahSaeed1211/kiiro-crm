'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

export function OrganizationListMenu({
  canImportExport,
  moreLabel,
  importLabel,
  exportLabel,
}: Readonly<{
  canImportExport: boolean
  moreLabel: string
  importLabel: string
  exportLabel: string
}>) {
  if (!canImportExport) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <MoreHorizontal aria-hidden />
        {moreLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<a href="/settings/import?type=organization" />}>{importLabel}</DropdownMenuItem>
          <DropdownMenuItem render={<a href="/api/v1/export/organizations" download />}>{exportLabel}</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
