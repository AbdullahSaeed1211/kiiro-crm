/* eslint-disable max-lines, max-lines-per-function, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/consistent-type-definitions, no-nested-ternary, sonarjs/no-nested-conditional -- editor keeps field draft, validation, and persistence in one focused settings surface. */
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'

type ConfigAction = (input: unknown) => Promise<ActionResult>
type FieldDefinition = {
  id: string
  recordType: string
  key: string
  label: string
  type: string
  required: boolean
  options: string[]
  visibility: string
  sensitive: boolean
  hidden: boolean
  position: number
}
const RECORD_TYPES = ['organization', 'contact', 'lead', 'deal', 'project', 'task'] as const
const TYPES = [
  'text',
  'textarea',
  'number',
  'currency',
  'date',
  'select',
  'multiSelect',
  'checkbox',
  'email',
  'url',
] as const
const title = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
const emptyField = (): FieldDefinition => ({
  id: '',
  recordType: 'contact',
  key: '',
  label: '',
  type: 'text',
  required: false,
  options: [],
  visibility: 'all',
  sensitive: false,
  hidden: false,
  position: 0,
})

function FieldForm({
  value,
  action,
  onDone,
  onCancel,
  isNew,
}: Readonly<{
  value: FieldDefinition
  action: ConfigAction
  onDone: () => void
  onCancel?: () => void
  isNew?: boolean
}>) {
  const router = useRouter()
  const [draft, setDraft] = useState(value)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const save = async () => {
    if (draft.key.trim() === '' || draft.label.trim() === '') {
      setMessage('Field key and label are required.')
      return
    }
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action({
        collection: 'fieldDefinitions',
        ...(draft.id ? { id: draft.id } : {}),
        recordType: draft.recordType,
        key: draft.key.trim(),
        label: draft.label.trim(),
        type: draft.type,
        required: draft.required,
        options: draft.options,
        visibility: draft.visibility,
        sensitive: draft.sensitive,
        hidden: draft.hidden,
        position: draft.position,
      })
      setMessage(result.ok ? (isNew ? 'Field created.' : 'Field saved.') : result.error)
      if (result.ok) {
        onDone()
        router.refresh()
      }
    } catch {
      setMessage('Unable to save field. Try again.')
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Record type</span>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={draft.recordType}
            onChange={(event) => setDraft({ ...draft, recordType: event.target.value })}
          >
            {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {title(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Field type</span>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={draft.type}
            onChange={(event) => setDraft({ ...draft, type: event.target.value })}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {title(type)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Field key</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            maxLength={80}
            placeholder="e.g. preferred_channel"
            value={draft.key}
            onChange={(event) => setDraft({ ...draft, key: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Label</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            maxLength={120}
            value={draft.label}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          />
        </label>
      </div>
      {draft.type === 'select' || draft.type === 'multiSelect' ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">
            Options <span className="font-normal text-muted-foreground">(comma separated)</span>
          </span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            value={draft.options.join(', ')}
            onChange={(event) =>
              setDraft({
                ...draft,
                options: event.target.value
                  .split(',')
                  .map((option) => option.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      ) : null}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(event) => setDraft({ ...draft, required: event.target.checked })}
          />{' '}
          Required
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.sensitive}
            onChange={(event) => setDraft({ ...draft, sensitive: event.target.checked })}
          />{' '}
          Sensitive
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.hidden}
            onChange={(event) => setDraft({ ...draft, hidden: event.target.checked })}
          />{' '}
          Hidden
        </label>
        <label className="inline-flex items-center gap-2">
          Visibility
          <select
            className="h-8 rounded-md border bg-background px-2"
            value={draft.visibility}
            onChange={(event) => setDraft({ ...draft, visibility: event.target.value })}
          >
            <option value="all">Everyone</option>
            <option value="manager_up">Managers and owners</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          type="button"
          disabled={pending}
          onClick={() => void save()}
        >
          {pending ? 'Saving…' : isNew ? 'Add field' : 'Save field'}
        </button>
        {onCancel ? (
          <button
            className="h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}

export function FieldDefinitionEditor({
  fields,
  action,
  deleteAction,
}: Readonly<{ fields: readonly FieldDefinition[]; action: ConfigAction; deleteAction: ConfigAction }>) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<string>()
  const remove = async (field: FieldDefinition) => {
    if (!window.confirm(`Delete the “${field.label}” field?`)) return
    const result = await deleteAction({ collection: 'fieldDefinitions', id: field.id })
    setMessage(result.ok ? 'Field deleted.' : result.error)
    if (result.ok) router.refresh()
  }
  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No custom fields yet.</p>
      ) : (
        <ul className="space-y-2" aria-label="Custom fields">
          {fields.map((field) =>
            editingId === field.id ? (
              <li key={field.id}>
                <FieldForm
                  value={field}
                  action={action}
                  onDone={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                key={field.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {field.label} <span className="font-normal text-muted-foreground">({field.key})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {title(field.recordType)} · {title(field.type)}
                    {field.required ? ' · Required' : ''}
                    {field.hidden ? ' · Hidden' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="button"
                    onClick={() => setEditingId(field.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="button"
                    onClick={() => void remove(field)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {adding ? (
        <FieldForm
          value={emptyField()}
          action={action}
          isNew
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={() => {
            setAdding(true)
            setMessage(undefined)
          }}
        >
          Add custom field
        </button>
      )}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
