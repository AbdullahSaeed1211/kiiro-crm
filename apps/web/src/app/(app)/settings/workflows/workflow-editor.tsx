'use client'

import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { WORKFLOW_COPY } from '../../../../i18n/workflow-copy'
import { type ConfigAction, type Workflow, type RequirementOptions } from './workflow-model'
import { WorkflowCard } from './workflow-card'
import { useWorkflowCreate } from './use-workflow-create'
import { WorkflowCreateForm } from './workflow-create-form'
import { Button } from '@ops/ui/components/ui/button'

interface WorkflowEditorProps {
  workflows: readonly Workflow[]
  action: ConfigAction
  deleteAction: ConfigAction
  requirementOptions: RequirementOptions
}

export function WorkflowEditor({ workflows, action, deleteAction, requirementOptions }: Readonly<WorkflowEditorProps>) {
  const copy = catalogFor(WORKFLOW_COPY, useLocale())
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
  } = useWorkflowCreate(copy)

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
        <Button variant="link" size="sm" type="button" onClick={handleToggleAdding}>
          {adding ? copy.cancelNew : copy.addWorkflow}
        </Button>
        {adding ? (
          <WorkflowCreateForm
            copy={copy}
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
