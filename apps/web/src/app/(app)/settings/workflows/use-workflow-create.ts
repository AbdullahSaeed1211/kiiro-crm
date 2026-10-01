import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SetStateAction, Dispatch } from 'react'
import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import { newStage, type ConfigAction } from './workflow-model'

interface CreateState {
  adding: boolean
  name: string
  recordType: string
  stageName: string
  message?: string
  pending: boolean
}

const defaultState: CreateState = {
  adding: false,
  name: '',
  recordType: 'lead',
  stageName: '',
  message: undefined,
  pending: false,
}

function createSetter(setState: Dispatch<SetStateAction<CreateState>>, key: keyof CreateState, resetMsg = false) {
  return (value: CreateState[keyof CreateState]) => {
    setState((s) => ({
      ...s,
      [key]: value,
      ...(resetMsg ? { message: undefined } : {}),
    }))
  }
}

export function useWorkflowCreate(copy: WorkflowCopy) {
  const router = useRouter()
  const [state, setState] = useState(defaultState)
  const create = async (action: ConfigAction) => {
    if (!state.name.trim() || !state.stageName.trim()) {
      setState((s) => ({ ...s, message: copy.createNeedsNames }))
      return
    }
    const stage = { ...newStage(), name: state.stageName.trim(), position: 0 }
    setState((s) => ({ ...s, pending: true }))
    try {
      const result = await action({
        collection: 'workflows',
        recordType: state.recordType,
        name: state.name.trim(),
        stages: [stage],
        defaultStageId: stage.id,
      })
      const msg = result.ok ? copy.created : result.error.message
      setState((s) => ({ ...s, pending: false, message: msg }))
      if (result.ok) {
        setState(defaultState)
        router.refresh()
      }
    } catch {
      setState((s) => ({ ...s, pending: false, message: copy.createFailed }))
    }
  }
  return {
    ...state,
    setAdding: createSetter(setState, 'adding', true),
    setName: createSetter(setState, 'name'),
    setRecordType: createSetter(setState, 'recordType'),
    setStageName: createSetter(setState, 'stageName'),
    create,
  }
}
