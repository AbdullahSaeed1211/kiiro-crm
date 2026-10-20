'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { archiveRecordAction } from '../../server/crm/archive'
import { describeClientError } from './client-errors'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { RECORD_COPY } from '../../i18n/record-copy'

const LIST_HREF = { organization: '/organizations', contact: '/contacts', lead: '/leads', deal: '/deals' } as const

type Props = Readonly<{
  type: 'organization' | 'contact' | 'lead' | 'deal'
  id: string
  label: string
}>

/** Asks for confirmation, archives the record, and returns to its list. */
export function ArchiveRecordButton({ type, id, label }: Props) {
  const router = useRouter()
  const copy = catalogFor(RECORD_COPY, useLocale())
  const [message, setMessage] = useState<string>()
  const archive = async () => {
    setMessage(undefined)
    try {
      const result = await archiveRecordAction({ type, id })
      if (result.ok) router.push(LIST_HREF[type])
      else setMessage(result.error.message)
    } catch (error) {
      setMessage(describeClientError(error, { context: 'archive record', fallback: copy.archiveFailed }))
    }
  }
  return (
    <>
      <ConfirmDialog
        title={copy.archiveTitle.replace('{name}', label)}
        description={copy.archiveBody}
        labels={{ cancel: copy.cancel, confirm: copy.archive, confirming: copy.archiving }}
        destructive
        onConfirm={archive}
        trigger={
          <Button variant="outline" size="sm" type="button">
            <Archive aria-hidden />
            {copy.archive}
          </Button>
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
