'use client'

import { useState } from 'react'
import type { ConfigAction, FieldDefinition } from './field-constants'
import { emptyField } from './field-constants'
import { useFieldDelete } from './use-field-delete'
import { FieldForm } from './field-form'
import { FieldList } from './field-list'

interface FieldDefinitionEditorProps {
  fields: readonly FieldDefinition[]
  action: ConfigAction
  deleteAction: ConfigAction
}

export function FieldDefinitionEditor({ fields, action, deleteAction }: Readonly<FieldDefinitionEditorProps>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<string>()
  const { pending: pendingDelete, message: deleteMessage, remove } = useFieldDelete(deleteAction)

  const displayMessage = message ?? deleteMessage

  const handleEdit = (id: string) => {
    setEditingId(id)
  }

  const handleDelete = (field: FieldDefinition) => {
    void remove(field)
  }

  const handleAddClick = () => {
    setAdding(true)
    setMessage(undefined)
  }

  const handleFormDone = () => {
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <FieldList
        fields={fields}
        editingId={editingId}
        pendingDelete={pendingDelete}
        action={action}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {adding ? (
        <FieldForm
          value={emptyField()}
          action={action}
          isNew
          onDone={handleFormDone}
          onCancel={() => {
            setAdding(false)
          }}
        />
      ) : (
        <button
          className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={handleAddClick}
        >
          Add custom field
        </button>
      )}
      {displayMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {displayMessage}
        </p>
      ) : null}
    </div>
  )
}
