'use client'

import { useState } from 'react'
import type { ConfigAction, FieldDefinition } from './field-constants'
import { emptyField } from './field-constants'
import { useFieldDelete } from './use-field-delete'
import { FieldForm } from './field-form'
import { FieldList } from './field-list'
import { Button } from '@ops/ui/components/ui/button'

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
        <Button variant="outline" size="lg" type="button" onClick={handleAddClick}>
          Add custom field
        </Button>
      )}
      {displayMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {displayMessage}
        </p>
      ) : null}
    </div>
  )
}
