'use client'

import { type ConfigAction, type Workflow, type RequirementOptions } from './workflow-model'
import { WorkflowCard } from './workflow-card'
import { useWorkflowCreate } from './use-workflow-create'
import { WorkflowCreateForm } from './workflow-create-form'

interface WorkflowEditorProps {
  workflows: readonly Workflow[]
  action: ConfigAction
  deleteAction: ConfigAction
  requirementOptions: RequirementOptions
}

export function WorkflowEditor({ workflows, action, deleteAction, requirementOptions }: Readonly<WorkflowEditorProps>) {
  const {
    adding,
    name,
    recordType,
    stageName,
    message,
    pending,
    setAdding,
    setName,
    setRecordType,
    setStageName,
    create,
  } = useWorkflowCreate()

  const handleToggleAdding = () => {
    setAdding(!adding)
  }

  const handleCreate = () => {
    void create(action)
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          workflow={workflow}
          action={action}
          deleteAction={deleteAction}
          requirementOptions={requirementOptions}
        />
      ))}
      <div className="rounded-lg border border-dashed p-4">
        <button
          className="text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={handleToggleAdding}
        >
          {adding ? 'Cancel new workflow' : 'Add workflow'}
        </button>
        {adding ? (
          <WorkflowCreateForm
            name={name}
            recordType={recordType}
            stageName={stageName}
            message={message}
            pending={pending}
            onNameChange={setName}
            onRecordTypeChange={setRecordType}
            onStageNameChange={setStageName}
            onCreate={handleCreate}
          />
        ) : null}
      </div>
    </div>
  )
}
