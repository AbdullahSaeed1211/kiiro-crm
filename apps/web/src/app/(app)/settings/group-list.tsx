'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { describeClientError } from '../client-errors'
import { GroupListItem } from './group-list-items'
import type { GroupAction } from './form-utils'

function GroupListMessage({ message }: Readonly<{ message: string | undefined }>) {
  if (!message) return null
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  )
}

function GroupListHeader() {
  return (
    <div>
      <h2 className="text-sm font-semibold">Existing groups</h2>
      <p className="text-sm text-muted-foreground">Rename or remove teams without leaving this page.</p>
    </div>
  )
}

function GroupEmptyState() {
  return <p className="text-sm text-muted-foreground">No groups yet.</p>
}

function GroupListContent({
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
  if (groups.length === 0) return <GroupEmptyState />
  return (
    <ul className="divide-y rounded-lg border" aria-label="Groups">
      {groups.map((group) => (
        <GroupListItem
          key={group.id}
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

function handleSaveError(error: unknown) {
  return describeClientError(error, {
    context: 'group update',
    fallback: 'Could not save this group. Please try again.',
  })
}

function handleDeleteError(error: unknown) {
  return describeClientError(error, {
    context: 'group delete',
    fallback: 'Could not delete this group. Please try again.',
  })
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
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()

  const save = async (id: string) => {
    if (draft.trim() === '') return
    setPending(true)
    try {
      const result = await action({ id, name: draft.trim() })
      setMessage(result.ok ? 'Group saved.' : result.error.message)
      if (result.ok) {
        setEditing(null)
        router.refresh()
      }
    } catch (error) {
      setMessage(handleSaveError(error))
    } finally {
      setPending(false)
    }
  }

  const remove = async (group: { id: string; name: string }) => {
    if (!window.confirm(`Delete the “${group.name}” group?`)) return
    setPending(true)
    try {
      const result = await deleteAction({ id: group.id })
      setMessage(result.ok ? 'Group deleted.' : result.error.message)
      if (result.ok) router.refresh()
    } catch (error) {
      setMessage(handleDeleteError(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3 border-t pt-5">
      <GroupListHeader />
      <GroupListContent
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
