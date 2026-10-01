'use client'

import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { WORKFLOW_COPY } from '../../../../i18n/workflow-copy'
import { useWorkflowDelete } from './use-workflow-delete'
import { useWorkflowDraft } from './use-workflow-draft'
import { useWorkflowSave } from './use-workflow-save'
import { ActionButtons, MessageStatus } from './workflow-card-sections'
import { WorkflowFlow } from './workflow-flow'
import { RECORD_TYPES, type ConfigAction, type RequirementOptions, type Workflow } from './workflow-model'

interface WorkflowCardProps {
  workflow: Workflow
  action: ConfigAction
  deleteAction: ConfigAction
  requirementOptions: RequirementOptions
}

function busyWith(saving: boolean, deleting: boolean): 'save' | 'delete' | null {
  if (saving) return 'save'
  return deleting ? 'delete' : null
}

/** One workflow: its name and record type, and its steps as a flow that can be reordered and extended. */
export function WorkflowCard({ workflow, action, deleteAction, requirementOptions }: Readonly<WorkflowCardProps>) {
  const copy = catalogFor(WORKFLOW_COPY, useLocale())
  const { draft, setDraft } = useWorkflowDraft(workflow)
  const save = useWorkflowSave(draft, copy)
  const remove = useWorkflowDelete(draft, copy)
  const pending = busyWith(save.pending, remove.pending)
  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{copy.workflowName}</span>
          <Input
            maxLength={120}
            value={draft.name}
            onChange={(event) => {
              setDraft({ ...draft, name: event.target.value })
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{copy.recordType}</span>
          <NativeSelect
            value={draft.recordType}
            onChange={(event) => {
              setDraft({ ...draft, recordType: event.target.value })
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
      <WorkflowFlow
        stages={draft.stages}
        showChance={draft.recordType === 'deal' || draft.recordType === 'lead'}
        requirements={requirementOptions[draft.recordType] ?? []}
        copy={copy}
        onStages={(stages) => {
          setDraft({ ...draft, stages })
        }}
      />
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-3">
        <ActionButtons
          pending={pending}
          copy={copy}
          onSave={() => {
            void save.save(action)
          }}
          onRemove={() => {
            void remove.remove(deleteAction)
          }}
        />
      </div>
      <MessageStatus message={save.message ?? remove.message} />
    </article>
  )
}
