'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ARCHIVE_COPY } from '../../i18n/archive-copy'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { archiveWorkAction } from '../../server/actions/work/archive'

const LIST_HREF = { task: '/tasks', project: '/projects' } as const

/** Asks for confirmation, archives the task or project, and returns to its list. */
export function ArchiveWorkButton({
  type,
  id,
  label,
  menu = false,
  open,
  onOpenChange,
}: Readonly<{
  type: 'task' | 'project'
  id: string
  label: string
  menu?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>) {
  const copy = catalogFor(ARCHIVE_COPY, useLocale())
  const router = useRouter()
  const [message, setMessage] = useState<string>()
  const archive = async () => {
    setMessage(undefined)
    const result = await archiveWorkAction({ type, id }).catch(() => undefined)
    if (result?.ok === true) router.push(LIST_HREF[type])
    else setMessage(result?.ok === false ? result.error.message : copy.failed)
  }
  return (
    <>
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title={copy.confirmTitle.replace('{name}', label)}
        description={type === 'task' ? copy.confirmTask : copy.confirmProject}
        labels={{ cancel: copy.cancel, confirm: copy.archive, confirming: copy.archiving }}
        destructive
        onConfirm={archive}
        trigger={
          open === undefined ? (
            <Button
              variant={menu ? 'ghost' : 'outline'}
              size="sm"
              type="button"
              className={menu ? 'w-full justify-start' : undefined}
            >
              <Archive aria-hidden />
              {copy.archive}
            </Button>
          ) : undefined
        }
      />
      {message === undefined ? null : (
        <span role="alert" className="text-xs text-destructive">
          {message}
        </span>
      )}
    </>
  )
}
