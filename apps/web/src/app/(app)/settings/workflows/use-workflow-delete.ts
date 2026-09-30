import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { title, type ConfigAction, type Workflow } from './workflow-model'

interface DeleteState {
  pending: boolean
  message: string | undefined
}

export function useWorkflowDelete(draft: Workflow) {
  const router = useRouter()
  const [state, setState] = useState<DeleteState>({
    pending: false,
    message: undefined,
  })

  const remove = async (deleteAction: ConfigAction) => {
    if (!window.confirm(`Delete the ${title(draft.recordType)} workflow “${draft.name}”?`)) {
      return
    }
    setState({ pending: true, message: undefined })
    try {
      const result = await deleteAction({ collection: 'workflows', id: draft.id })
      setState({
        pending: false,
        message: result.ok ? 'Workflow deleted.' : result.error.message,
      })
      if (result.ok) {
        router.refresh()
      }
    } catch {
      setState({
        pending: false,
        message: 'Unable to delete workflow. Try again.',
      })
    }
  }

  return {
    pending: state.pending,
    message: state.message,
    remove,
  }
}
