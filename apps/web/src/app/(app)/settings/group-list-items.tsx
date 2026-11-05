'use client'
import { Button } from '@ops/ui/components/ui/button'
import type { GroupsCopy } from '../../../i18n/groups-copy'

function GroupItemName({
  copy,
  editing,
  draft,
  groupName,
  onDraftChange,
}: Readonly<{
  copy: GroupsCopy
  editing: boolean
  draft: string
  groupName: string
  onDraftChange: (value: string) => void
}>) {
  return editing ? (
    <input
      className="h-9 min-w-48 flex-1 rounded-md border bg-background px-2"
      aria-label={copy.groupName}
      maxLength={120}
      value={draft}
      onChange={(event) => {
        onDraftChange(event.target.value)
      }}
    />
  ) : (
    <span className="font-medium">{groupName}</span>
  )
}

function GroupItemActions({
  copy,
  editing,
  pending,
  groupId,
  groupName,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: Readonly<{
  copy: GroupsCopy
  editing: boolean
  pending: boolean
  groupId: string
  groupName: string
  onEdit: (id: string, name: string) => void
  onCancel: () => void
  onSave: (id: string) => void
  onDelete: (group: { id: string; name: string }) => void
}>) {
  return (
    <span className="flex items-center gap-3">
      {editing ? (
        <>
          <Button
            variant="link"
            size="sm"
            type="button"
            disabled={pending}
            onClick={() => {
              onSave(groupId)
            }}
          >
            {copy.save}
          </Button>
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground"
            type="button"
            onClick={() => {
              onCancel()
            }}
          >
            {copy.cancel}
          </Button>
        </>
      ) : (
        <Button
          variant="link"
          size="sm"
          type="button"
          onClick={() => {
            onEdit(groupId, groupName)
          }}
        >
          {copy.edit}
        </Button>
      )}
      <Button
        variant="link"
        size="sm"
        className="text-destructive"
        type="button"
        disabled={pending || editing}
        onClick={() => {
          onDelete({ id: groupId, name: groupName })
        }}
      >
        {copy.delete}
      </Button>
    </span>
  )
}

export function GroupListItem({
  copy,
  group,
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
  group: { id: string; name: string }
  editing: boolean
  draft: string
  pending: boolean
  onEdit: (id: string, name: string) => void
  onCancel: () => void
  onSave: (id: string) => void
  onDelete: (group: { id: string; name: string }) => void
  onDraftChange: (value: string) => void
}>) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm" key={group.id}>
      <GroupItemName copy={copy} editing={editing} draft={draft} groupName={group.name} onDraftChange={onDraftChange} />
      <GroupItemActions
        copy={copy}
        editing={editing}
        pending={pending}
        groupId={group.id}
        groupName={group.name}
        onEdit={onEdit}
        onCancel={onCancel}
        onSave={onSave}
        onDelete={onDelete}
      />
    </li>
  )
}
