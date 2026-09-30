import type { FieldDefinition } from './field-constants'
import { capitalize } from './field-constants'

interface FieldListItemProps {
  readonly field: FieldDefinition
  readonly isEditing: boolean
  readonly isPendingDelete: boolean
  readonly onEdit: () => void
  readonly onDelete: () => void
}

export function FieldListItem({ field, isEditing, isPendingDelete, onEdit, onDelete }: Readonly<FieldListItemProps>) {
  if (isEditing) return null

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {field.label} <span className="font-normal text-muted-foreground">({field.key})</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {capitalize(field.recordType)} · {capitalize(field.type)}
          {field.required ? ' · Required' : ''}
          {field.hidden ? ' · Hidden' : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-3">
        <button
          className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={onEdit}
        >
          Edit
        </button>
        <button
          className="text-xs text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          disabled={isPendingDelete}
          onClick={() => {
            onDelete()
          }}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
