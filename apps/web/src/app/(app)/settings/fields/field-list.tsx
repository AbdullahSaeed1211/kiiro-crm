import type { ConfigAction, FieldDefinition } from './field-constants'
import { FieldForm } from './field-form'
import { FieldListItem } from './field-list-item'

interface FieldListProps {
  readonly fields: readonly FieldDefinition[]
  readonly editingId: string | null
  readonly pendingDelete: boolean
  readonly action: ConfigAction
  readonly onEdit: (id: string) => void
  readonly onDelete: (field: FieldDefinition) => void
}

export function FieldList({ fields, editingId, pendingDelete, action, onEdit, onDelete }: Readonly<FieldListProps>) {
  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">No custom fields yet.</p>
  }

  return (
    <ul className="space-y-2" aria-label="Custom fields">
      {fields.map((field) => {
        if (editingId === field.id) {
          return (
            <li key={field.id}>
              <FieldForm
                value={field}
                action={action}
                onDone={() => {
                  onEdit('')
                }}
                onCancel={() => {
                  onEdit('')
                }}
              />
            </li>
          )
        }
        return (
          <FieldListItem
            key={field.id}
            field={field}
            isEditing={false}
            isPendingDelete={pendingDelete}
            onEdit={() => {
              onEdit(field.id)
            }}
            onDelete={() => {
              onDelete(field)
            }}
          />
        )
      })}
    </ul>
  )
}
