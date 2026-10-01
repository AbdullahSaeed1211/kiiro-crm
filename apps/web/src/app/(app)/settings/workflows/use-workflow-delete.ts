import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import type { ConfigAction, Workflow } from './workflow-model'

interface DeleteState {
  pending: boolean
  message: string | undefined
}

export function useWorkflowDelete(draft: Workflow, copy: WorkflowCopy) {
  const router = useRouter()
  const [state, setState] = useState<DeleteState>({
    pending: false,
    message: undefined,
  })

  const remove = async (deleteAction: ConfigAction) => {
    if (!window.confirm(copy.confirmDelete.replace('{name}', draft.name))) {
      return
    }
    setState({ pending: true, message: undefined })
    try {
      const result = await deleteAction({ collection: 'workflows', id: draft.id })
      setState({
        pending: false,
        message: result.ok ? copy.deleted : result.error.message,
      })
      if (result.ok) {
        router.refresh()
      }
    } catch {
      setState({
        pending: false,
        message: copy.deleteFailed,
      })
    }
  }

  return {
    pending: state.pending,
    message: state.message,
    remove,
  }
}
