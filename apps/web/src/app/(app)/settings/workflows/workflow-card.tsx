'use client'

import { useWorkflowDraft } from './use-workflow-draft'
import { useWorkflowSave } from './use-workflow-save'
import { useWorkflowDelete } from './use-workflow-delete'
import {
  WorkflowNameInput,
  RecordTypeSelect,
  StagesList,
  DefaultStageSelect,
  ActionButtons,
  MessageStatus,
} from './workflow-card-sections'
import { newStage, isTerminal, type ConfigAction, type RequirementOptions, type Workflow } from './workflow-model'

interface WorkflowCardProps {
  workflow: Workflow
  action: ConfigAction
  deleteAction: ConfigAction
  requirementOptions: RequirementOptions
}

export function WorkflowCard({ workflow, action, deleteAction, requirementOptions }: Readonly<WorkflowCardProps>) {
  const { draft, setDraft, updateStage } = useWorkflowDraft(workflow)
  const { pending: savePending, message: saveMessage, save } = useWorkflowSave(draft)
  const { pending: deletePending, message: deleteMessage, remove } = useWorkflowDelete(draft)

  let pending: 'save' | 'delete' | null = null
  if (savePending) {
    pending = 'save'
  } else if (deletePending) {
    pending = 'delete'
  }
  const message = saveMessage ?? deleteMessage

  const handleSave = () => {
    void save(action)
  }

  const handleRemove = () => {
    void remove(deleteAction)
  }

  const handleAddStage = () => {
    setDraft((current) => ({
      ...current,
      stages: [...current.stages, { ...newStage(), position: current.stages.length }],
    }))
  }

  const handleRemoveStage = (stageId: string) => {
    setDraft((current) => ({
      ...current,
      stages: current.stages.filter((candidate) => candidate.id !== stageId),
      defaultStageId:
        current.defaultStageId === stageId
          ? (current.stages.find((candidate) => candidate.id !== stageId && !isTerminal(candidate.category))?.id ?? '')
          : current.defaultStageId,
    }))
  }

  const handleNameChange = (name: string) => {
    setDraft({ ...draft, name })
  }

  const handleRecordTypeChange = (recordType: string) => {
    setDraft({ ...draft, recordType })
  }

  const handleDefaultStageChange = (defaultStageId: string) => {
    setDraft({ ...draft, defaultStageId })
  }

  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <WorkflowNameInput value={draft.name} onChange={handleNameChange} />
        <RecordTypeSelect value={draft.recordType} onChange={handleRecordTypeChange} />
      </div>
      <StagesList
        stages={draft.stages}
        recordType={draft.recordType}
        requirementOptions={requirementOptions}
        onAddStage={handleAddStage}
        onStageChange={updateStage}
        onRemoveStage={handleRemoveStage}
      />
      <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-3">
        <DefaultStageSelect stages={draft.stages} value={draft.defaultStageId} onChange={handleDefaultStageChange} />
        <ActionButtons pending={pending} onSave={handleSave} onRemove={handleRemove} />
      </div>
      <MessageStatus message={message} />
    </article>
  )
}
