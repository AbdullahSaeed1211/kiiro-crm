import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { isTerminal, type ConfigAction, type Workflow } from './workflow-model'

function validateWorkflow(draft: Workflow): string | null {
  const stages = draft.stages
  const complete =
    draft.name.trim() !== '' &&
    stages.length > 0 &&
    stages.every((stage) => stage.name.trim() !== '') &&
    stages.some((stage) => !isTerminal(stage.category))
  return complete ? null : 'Add a workflow name, a name for every stage, and a non-terminal default.'
}

export function useWorkflowSave(draft: Workflow) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()

  const save = async (action: ConfigAction) => {
    const validation = validateWorkflow(draft)
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
      const msg = result.ok ? 'Workflow saved.' : result.error.message
      if (result.ok) router.refresh()
      setMessage(msg)
    } catch {
      setMessage('Unable to save workflow. Try again.')
    } finally {
      setPending(false)
    }
  }

  return { pending, message, save }
}
