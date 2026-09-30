'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { RECORD_TYPES, title } from './workflow-model'

interface WorkflowCreateFormProps {
  name: string
  recordType: string
  stageName: string
  message: string | undefined
  pending: boolean
  onNameChange: (value: string) => void
  onRecordTypeChange: (value: string) => void
  onStageNameChange: (value: string) => void
  onCreate: () => void
}

export function WorkflowCreateForm({
  name,
  recordType,
  stageName,
  message,
  pending,
  onNameChange,
  onRecordTypeChange,
  onStageNameChange,
  onCreate,
}: Readonly<WorkflowCreateFormProps>) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Workflow name</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            value={name}
            onChange={(event) => {
              onNameChange(event.target.value)
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Record type</span>
          <NativeSelect
            value={recordType}
            onChange={(event) => {
              onRecordTypeChange(event.target.value)
            }}
          >
            {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {title(type)}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">First stage</span>
        <input
          className="h-10 rounded-md border bg-background px-3"
          value={stageName}
          onChange={(event) => {
            onStageNameChange(event.target.value)
          }}
        />
      </label>
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={pending}
        type="button"
        onClick={() => {
          onCreate()
        }}
      >
        {pending ? 'Creating...' : 'Create workflow'}
      </button>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
