'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { describeClientError } from '../client-errors'
import { GroupListItem } from './group-list-items'
import type { GroupAction } from './form-utils'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { GROUPS_COPY } from '../../../i18n/groups-copy'
import type { GroupsCopy } from '../../../i18n/groups-copy'

function GroupListMessage({ message }: Readonly<{ message: string | undefined }>) {
  if (!message) return null
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  )
}

function GroupListHeader({ copy }: Readonly<{ copy: GroupsCopy }>) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{copy.existing}</h2>
      <p className="text-sm text-muted-foreground">{copy.existingHelp}</p>
    </div>
  )
}

function GroupEmptyState({ copy }: Readonly<{ copy: GroupsCopy }>) {
  return <p className="text-sm text-muted-foreground">{copy.none}</p>
}

function GroupListContent({
  copy,
  groups,
  editing,
  draft,
  pending,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onDraftChange,
}: Readonly<{
  copy: GroupsCopy
  groups: readonly { id: string; name: string }[]
  editing: string | null
  draft: string
  pending: boolean
  onEdit: (id: string, name: string) => void
  onCancel: () => void
  onSave: (id: string) => void
  onDelete: (group: { id: string; name: string }) => void
  onDraftChange: (value: string) => void
}>) {
  if (groups.length === 0) return <GroupEmptyState copy={copy} />
  return (
    <ul className="divide-y rounded-lg border" aria-label={copy.list}>
      {groups.map((group) => (
        <GroupListItem
          key={group.id}
          copy={copy}
          group={group}
          editing={editing === group.id}
          draft={draft}
          pending={pending}
          onEdit={onEdit}
          onCancel={onCancel}
          onSave={onSave}
          onDelete={onDelete}
          onDraftChange={onDraftChange}
        />
      ))}
    </ul>
  )
}

export function GroupList({
  groups,
  action,
  deleteAction,
}: Readonly<{
  groups: readonly { id: string; name: string }[]
  action: GroupAction
  deleteAction: GroupAction
}>) {
  const router = useRouter()
  const copy = catalogFor(GROUPS_COPY, useLocale())
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()

  const save = async (id: string) => {
    if (draft.trim() === '') return
    setPending(true)
    try {
      const result = await action({ id, name: draft.trim() })
      setMessage(result.ok ? copy.saved : result.error.message)
      if (result.ok) {
        setEditing(null)
        router.refresh()
      }
    } catch (error) {
      setMessage(describeClientError(error, { context: 'group update', fallback: copy.updateFailed }))
    } finally {
      setPending(false)
    }
  }

  const remove = async (group: { id: string; name: string }) => {
    if (!window.confirm(copy.confirmDelete.replace('{name}', group.name))) return
    setPending(true)
    try {
      const result = await deleteAction({ id: group.id })
      setMessage(result.ok ? copy.deleted : result.error.message)
      if (result.ok) router.refresh()
    } catch (error) {
      setMessage(describeClientError(error, { context: 'group delete', fallback: copy.deleteFailed }))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3 border-t pt-5">
      <GroupListHeader copy={copy} />
      <GroupListContent
        copy={copy}
        groups={groups}
        editing={editing}
        draft={draft}
        pending={pending}
        onEdit={(id, name) => {
          setEditing(id)
          setDraft(name)
          setMessage(undefined)
        }}
        onCancel={() => {
          setEditing(null)
        }}
        onSave={(id) => {
          void save(id)
        }}
        onDelete={(group) => {
          void remove(group)
        }}
        onDraftChange={setDraft}
      />
      <GroupListMessage message={message} />
    </div>
  )
}
