'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Archive, ChevronDown } from 'lucide-react'
import { Button } from '@ops/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { ARCHIVE_COPY } from '../../../../i18n/archive-copy'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { ArchiveWorkButton } from '../../archive-work-button'

export function ProjectPageActions({
  projectId,
  projectName,
  createTaskLabel,
  contentLabel,
  moreLabel,
  canArchive,
}: Readonly<{
  projectId: string
  projectName: string
  createTaskLabel: string
  contentLabel: string
  moreLabel: string
  canArchive: boolean
}>) {
  const [archiveOpen, setArchiveOpen] = useState(false)
  const archiveCopy = catalogFor(ARCHIVE_COPY, useLocale())
  return (
    <div className="flex items-center gap-2">
      <Link
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={`/tasks/new?projectId=${encodeURIComponent(projectId)}`}
      >
        {createTaskLabel}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="min-h-10" />}>
          {moreLabel}
          <ChevronDown aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem render={<Link href={`/content-calendar?projectId=${encodeURIComponent(projectId)}`} />}>
            {contentLabel}
          </DropdownMenuItem>
          {canArchive ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setArchiveOpen(true)
              }}
            >
              <Archive aria-hidden />
              {archiveCopy.archive}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {canArchive ? (
        <ArchiveWorkButton
          type="project"
          id={projectId}
          label={projectName}
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
        />
      ) : null}
    </div>
  )
}
