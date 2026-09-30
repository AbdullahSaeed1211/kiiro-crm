import { useState } from 'react'
import type { Stage, Workflow } from './workflow-model'

export function useWorkflowDraft(workflow: Workflow) {
  const [draft, setDraft] = useState(workflow)

  const updateStage = (id: string, changes: Partial<Stage>) => {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((stage) => (stage.id === id ? { ...stage, ...changes } : stage)),
    }))
  }

  return { draft, setDraft, updateStage }
}
