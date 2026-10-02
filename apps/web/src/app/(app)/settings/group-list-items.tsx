'use client'
import { Button } from '@ops/ui/components/ui/button'

function GroupItemName({
  editing,
  draft,
  groupName,
  onDraftChange,
}: Readonly<{ editing: boolean; draft: string; groupName: string; onDraftChange: (value: string) => void }>) {
  return editing ? (
    <input
      className="h-9 min-w-48 flex-1 rounded-md border bg-background px-2"
      aria-label="Group name"
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
  editing,
  pending,
  groupId,
  groupName,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: Readonly<{
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
            Save
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
            Cancel
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
          Edit
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
        Delete
      </Button>
    </span>
  )
}

export function GroupListItem({
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
      <GroupItemName editing={editing} draft={draft} groupName={group.name} onDraftChange={onDraftChange} />
      <GroupItemActions
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
