import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { RECORD_TYPES, title, isTerminal } from './workflow-model'
import { StageRow } from './workflow-stage-row'
import type { RequirementOptions, Stage } from './workflow-model'

interface WorkflowNameInputProps {
  value: string
  onChange: (value: string) => void
}

export function WorkflowNameInput({ value, onChange }: Readonly<WorkflowNameInputProps>) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">Workflow name</span>
      <input
        className="h-10 rounded-md border bg-background px-3"
        maxLength={120}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
    </label>
  )
}

interface RecordTypeSelectProps {
  value: string
  onChange: (value: string) => void
}

export function RecordTypeSelect({ value, onChange }: Readonly<RecordTypeSelectProps>) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">Record type</span>
      <NativeSelect
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        {RECORD_TYPES.map((type) => (
          <option key={type} value={type}>
            {title(type)}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

interface StagesListProps {
  stages: readonly Stage[]
  recordType: string
  requirementOptions: RequirementOptions
  onAddStage: () => void
  onStageChange: (stageId: string, changes: Partial<Stage>) => void
  onRemoveStage: (stageId: string) => void
}

export function StagesList({
  stages,
  recordType,
  requirementOptions,
  onAddStage,
  onStageChange,
  onRemoveStage,
}: Readonly<StagesListProps>) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Stages</h3>
          <p className="text-xs text-muted-foreground">
            Order, category, colour, and win probability are saved with the workflow.
          </p>
        </div>
        <button
          className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={() => {
            onAddStage()
          }}
        >
          Add stage
        </button>
      </div>
      <div className="space-y-2">
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            index={index}
            requirementOptions={requirementOptions[recordType] ?? []}
            onChange={(changes) => {
              onStageChange(stage.id, changes)
            }}
            onRemove={() => {
              onRemoveStage(stage.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface DefaultStageSelectProps {
  stages: readonly Stage[]
  value: string
  onChange: (value: string) => void
}

export function DefaultStageSelect({ stages, value, onChange }: Readonly<DefaultStageSelectProps>) {
  return (
    <label className="grid min-w-52 gap-1 text-sm">
      <span className="font-medium">Default stage</span>
      <NativeSelect
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        {stages
          .filter((stage) => !isTerminal(stage.category))
          .map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name || 'Unnamed stage'}
            </option>
          ))}
      </NativeSelect>
    </label>
  )
}

interface ActionButtonsProps {
  pending: 'save' | 'delete' | null
  onSave: () => void
  onRemove: () => void
}

export function ActionButtons({ pending, onSave, onRemove }: Readonly<ActionButtonsProps>) {
  return (
    <div className="flex items-center gap-3">
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          onSave()
        }}
      >
        {pending === 'save' ? 'Saving…' : 'Save workflow'}
      </button>
      <button
        className="h-10 rounded-md px-3 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          onRemove()
        }}
      >
        {pending === 'delete' ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}

interface MessageStatusProps {
  message: string | undefined
}

export function MessageStatus({ message }: Readonly<MessageStatusProps>) {
  if (!message) {
    return null
  }
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  )
}
