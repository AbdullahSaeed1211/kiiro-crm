'use client'

import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import { RECORD_TYPES } from './workflow-model'

interface WorkflowCreateFormProps {
  copy: WorkflowCopy
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
  copy,
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
          <span className="font-medium">{copy.workflowName}</span>
          <Input
            value={name}
            onChange={(event) => {
              onNameChange(event.target.value)
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{copy.recordType}</span>
          <NativeSelect
            value={recordType}
            onChange={(event) => {
              onRecordTypeChange(event.target.value)
            }}
          >
            {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {copy.recordTypes[type] ?? type}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{copy.firstStep}</span>
        <Input
          value={stageName}
          placeholder={copy.stageNamePlaceholder}
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
        {pending ? copy.creating : copy.create}
      </button>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
