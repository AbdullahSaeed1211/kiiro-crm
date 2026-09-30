'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { archiveRecordAction } from '../../server/crm/archive'
import { describeClientError } from './client-errors'

const LIST_HREF = { organization: '/organizations', contact: '/contacts', lead: '/leads', deal: '/deals' } as const

type Props = Readonly<{
  type: 'organization' | 'contact' | 'lead' | 'deal'
  id: string
  label: string
}>

/** Asks for confirmation, archives the record, and returns to its list. */
export function ArchiveRecordButton({ type, id, label }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState<string>()
  const archive = async () => {
    setMessage(undefined)
    try {
      const result = await archiveRecordAction({ type, id })
      if (result.ok) router.push(LIST_HREF[type])
      else setMessage(result.error.message)
    } catch (error) {
      setMessage(describeClientError(error, { context: 'archive record', fallback: 'Unable to archive. Try again.' }))
    }
  }
  return (
    <>
      <ConfirmDialog
        title={`Archive ${label}?`}
        description="It leaves every list and search. Its notes and history are kept."
        labels={{ cancel: 'Cancel', confirm: 'Archive', confirming: 'Archiving…' }}
        destructive
        onConfirm={archive}
        trigger={
          <Button variant="outline" size="sm" type="button">
            <Archive aria-hidden />
            Archive
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
