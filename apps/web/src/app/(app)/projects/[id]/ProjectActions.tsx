/* eslint-disable max-lines-per-function, complexity -- this compact action cluster owns two async mutations and their feedback state. */
'use client'

import { Button } from '@ops/ui/components/ui/button'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { addProjectMember } from '../../../../server/actions/work/projects/addProjectMember'
import { removeProjectMember } from '../../../../server/actions/work/projects/removeProjectMember'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ProjectActions({
  projectId,
  updatedAt,
  memberIds,
  people,
}: Readonly<{
  projectId: string
  updatedAt: number
  memberIds: readonly string[]
  people: readonly [string, string][]
}>) {
  const router = useRouter()
  const [member, setMember] = useState('')
  const [remove, setRemove] = useState('')
  const [busy, setBusy] = useState<'add' | 'remove' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const availableMembers = people.filter(([id]) => !memberIds.includes(id))

  const submit = async (kind: 'add' | 'remove') => {
    const selected = kind === 'add' ? member : remove
    if (selected === '') return
    setBusy(kind)
    setMessage(null)
    const result =
      kind === 'add'
        ? await addProjectMember(projectId, selected, updatedAt)
        : await removeProjectMember(projectId, selected, updatedAt)
    setBusy(null)
    if (!result.ok) {
      setMessage(result.error.message)
      return
    }
    setMessage(kind === 'add' ? 'Member added.' : 'Member removed.')
    router.refresh()
  }

  return (
    <div className="ops-project-actions grid w-full gap-2 sm:w-auto sm:grid-cols-2">
      <div className="flex min-w-0 gap-2">
        <select
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          value={member}
          onChange={(event) => {
            setMember(event.target.value)
          }}
          aria-label="Add project member"
          disabled={busy !== null || availableMembers.length === 0}
        >
          <option value="">{availableMembers.length === 0 ? 'All members added' : 'Add member…'}</option>
          {availableMembers.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" disabled={member === '' || busy !== null} onClick={() => void submit('add')}>
          {busy === 'add' ? 'Adding…' : 'Add'}
        </Button>
      </div>
      <div className="flex min-w-0 gap-2">
        <select
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          value={remove}
          onChange={(event) => {
            setRemove(event.target.value)
          }}
          aria-label="Remove project member"
          disabled={busy !== null || memberIds.length === 0}
        >
          <option value="">{memberIds.length === 0 ? 'No members' : 'Remove member…'}</option>
          {memberIds.map((id) => (
            <option key={id} value={id}>
              {people.find(([personId]) => personId === id)?.[1] ?? 'Unavailable member'}
            </option>
          ))}
        </select>
        <ConfirmDialog
          title="Remove project member?"
          description="They will lose access to this project, but remain in the workspace."
          labels={{ cancel: 'Cancel', confirm: 'Remove member', confirming: 'Removing…' }}
          destructive
          onConfirm={() => submit('remove')}
          trigger={
            <Button type="button" size="sm" variant="outline" disabled={remove === '' || busy !== null}>
              {busy === 'remove' ? 'Removing…' : 'Remove'}
            </Button>
          }
        />
      </div>
      {message === null ? null : (
        <p className="col-span-full text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  )
}
