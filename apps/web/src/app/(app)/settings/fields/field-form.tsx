'use client'

import type { FieldDefinition, ConfigAction } from './field-constants'
import { useFieldDraft } from './use-field-draft'
import { FieldFormHeader } from './field-form-header'
import { FieldFormInputs } from './field-form-inputs'
import { FieldFormOptions } from './field-form-options'
import { FieldFormCheckboxes } from './field-form-checkboxes'
import { FieldFormActions } from './field-form-actions'

interface FieldFormProps {
  value: FieldDefinition
  action: ConfigAction
  onDone: () => void
  onCancel?: () => void
  isNew?: boolean
}

export function FieldForm({ value, action, onDone, onCancel, isNew }: Readonly<FieldFormProps>) {
  const { draft, setDraft, pending, message, save } = useFieldDraft(value, action)

  const handleSave = () => {
    void (async () => {
      const success = await save(isNew)
      if (success) onDone()
    })()
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <FieldFormHeader value={draft} onChange={setDraft} />
      <FieldFormInputs value={draft} onChange={setDraft} />
      <FieldFormOptions value={draft} onChange={setDraft} />
      <FieldFormCheckboxes value={draft} onChange={setDraft} />
      <FieldFormActions pending={pending} isNew={isNew} onSave={handleSave} onCancel={onCancel} />
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
