import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import { isTerminal, type ConfigAction, type Workflow } from './workflow-model'

function validateWorkflow(draft: Workflow, copy: WorkflowCopy): string | null {
  const stages = draft.stages
  const complete =
    draft.name.trim() !== '' &&
    stages.length > 0 &&
    stages.every((stage) => stage.name.trim() !== '') &&
    stages.some((stage) => !isTerminal(stage.category))
  return complete ? null : copy.needsNames
}

export function useWorkflowSave(draft: Workflow, copy: WorkflowCopy) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()

  const save = async (action: ConfigAction) => {
    const validation = validateWorkflow(draft, copy)
    if (validation) {
      setMessage(validation)
      return
    }

    const stages = draft.stages.map((stage, position) => ({ ...stage, position }))
    const defaultStage = stages.find((stage) => !isTerminal(stage.category))

    try {
      setPending(true)
      const result = await action({
        collection: 'workflows',
        id: draft.id,
        recordType: draft.recordType,
        name: draft.name.trim(),
        stages,
        defaultStageId: defaultStage?.id ?? '',
      })
      const msg = result.ok ? copy.saved : result.error.message
      if (result.ok) router.refresh()
      setMessage(msg)
    } catch {
      setMessage(copy.saveFailed)
    } finally {
      setPending(false)
    }
  }

  return { pending, message, save }
}
