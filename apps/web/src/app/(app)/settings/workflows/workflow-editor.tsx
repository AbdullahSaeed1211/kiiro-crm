/* eslint-disable complexity, max-lines, max-lines-per-function, @typescript-eslint/no-confusing-void-expression, sonarjs/no-nested-functions -- creation and card composition remain a single settings workflow surface. */
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  newStage,
  isTerminal,
  RECORD_TYPES,
  title,
  type ConfigAction,
  type Stage,
  type Workflow,
} from './workflow-model'
import { StageRow } from './workflow-stage-row'

/* Workflow creation and card editing remain one focused settings surface. */
function WorkflowCard({
  workflow,
  action,
  deleteAction,
}: Readonly<{ workflow: Workflow; action: ConfigAction; deleteAction: ConfigAction }>) {
  const router = useRouter()
  const [draft, setDraft] = useState(workflow)
  const [pending, setPending] = useState<'save' | 'delete' | null>(null)
  const [message, setMessage] = useState<string>()
  const updateStage = (id: string, changes: Partial<Stage>) =>
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((stage) => (stage.id === id ? { ...stage, ...changes } : stage)),
    }))
  const save = async () => {
    const stages = draft.stages.map((stage, position) => ({ ...stage, position }))
    const defaultStage =
      stages.find((stage) => stage.id === draft.defaultStageId && !isTerminal(stage.category)) ??
      stages.find((stage) => !isTerminal(stage.category))
    if (
      draft.name.trim() === '' ||
      stages.length === 0 ||
      stages.some((stage) => stage.name.trim() === '') ||
      defaultStage === undefined
    ) {
      setMessage('Add a workflow name, a name for every stage, and a non-terminal default.')
      return
    }
    setPending('save')
    setMessage(undefined)
    try {
      const result = await action({
        collection: 'workflows',
        id: draft.id,
        recordType: draft.recordType,
        name: draft.name.trim(),
        stages,
        defaultStageId: defaultStage.id,
      })
      setMessage(result.ok ? 'Workflow saved.' : result.error)
      if (result.ok) router.refresh()
    } catch {
      setMessage('Unable to save workflow. Try again.')
    } finally {
      setPending(null)
    }
  }
  const remove = async () => {
    if (!window.confirm(`Delete the ${title(draft.recordType)} workflow “${draft.name}”?`)) return
    setPending('delete')
    setMessage(undefined)
    try {
      const result = await deleteAction({ collection: 'workflows', id: draft.id })
      setMessage(result.ok ? 'Workflow deleted.' : result.error)
      if (result.ok) router.refresh()
    } catch {
      setMessage('Unable to delete workflow. Try again.')
    } finally {
      setPending(null)
    }
  }
  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Workflow name</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            maxLength={120}
            value={draft.name}
            onChange={(event) => {
              setDraft({ ...draft, name: event.target.value })
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Record type</span>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={draft.recordType}
            onChange={(event) => {
              setDraft({ ...draft, recordType: event.target.value })
            }}
          >
            {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {title(type)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Stages</h3>
            <p className="text-xs text-muted-foreground">
              Order, category, colour, and win probability are saved with the workflow.
            </p>
          </div>
          <button
            className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            onClick={() => {
              setDraft((current) => ({
                ...current,
                stages: [...current.stages, { ...newStage(), position: current.stages.length }],
              }))
            }}
          >
            Add stage
          </button>
        </div>
        <div className="space-y-2">
          {draft.stages.map((stage, index) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={index}
              onChange={(changes) => {
                updateStage(stage.id, changes)
              }}
              onRemove={() => {
                setDraft((current) => ({
                  ...current,
                  stages: current.stages.filter((candidate) => candidate.id !== stage.id),
                  defaultStageId:
                    current.defaultStageId === stage.id
                      ? (current.stages.find(
                          (candidate) => candidate.id !== stage.id && !isTerminal(candidate.category),
                        )?.id ?? '')
                      : current.defaultStageId,
                }))
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-3">
        <label className="grid min-w-52 gap-1 text-sm">
          <span className="font-medium">Default stage</span>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={draft.defaultStageId}
            onChange={(event) => {
              setDraft({ ...draft, defaultStageId: event.target.value })
            }}
          >
            {draft.stages
              .filter((stage) => !isTerminal(stage.category))
              .map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name || 'Unnamed stage'}
                </option>
              ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            type="button"
            disabled={pending !== null}
            onClick={() => {
              void save()
            }}
          >
            {pending === 'save' ? 'Saving…' : 'Save workflow'}
          </button>
          <button
            className="h-10 rounded-md px-3 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            type="button"
            disabled={pending !== null}
            onClick={() => {
              void remove()
            }}
          >
            {pending === 'delete' ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </article>
  )
}

export function WorkflowEditor({
  workflows,
  action,
  deleteAction,
}: Readonly<{ workflows: readonly Workflow[]; action: ConfigAction; deleteAction: ConfigAction }>) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [recordType, setRecordType] = useState('lead')
  const [stageName, setStageName] = useState('')
  const [message, setMessage] = useState<string>()
  const create = async () => {
    if (name.trim() === '' || stageName.trim() === '') {
      setMessage('Workflow name and first stage are required.')
      return
    }
    const stage = { ...newStage(), name: stageName.trim(), position: 0 }
    const result = await action({
      collection: 'workflows',
      recordType,
      name: name.trim(),
      stages: [stage],
      defaultStageId: stage.id,
    })
    setMessage(result.ok ? 'Workflow created.' : result.error)
    if (result.ok) {
      setAdding(false)
      router.refresh()
    }
  }
  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <WorkflowCard key={workflow.id} workflow={workflow} action={action} deleteAction={deleteAction} />
      ))}
      <div className="rounded-lg border border-dashed p-4">
        <button
          className="text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={() => {
            setAdding((current) => !current)
            setMessage(undefined)
          }}
        >
          {adding ? 'Cancel new workflow' : 'Add workflow'}
        </button>
        {adding ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Workflow name</span>
                <input
                  className="h-10 rounded-md border bg-background px-3"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                  }}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Record type</span>
                <select
                  className="h-10 rounded-md border bg-background px-3"
                  value={recordType}
                  onChange={(event) => {
                    setRecordType(event.target.value)
                  }}
                >
                  {RECORD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {title(type)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">First stage</span>
              <input
                className="h-10 rounded-md border bg-background px-3"
                value={stageName}
                onChange={(event) => {
                  setStageName(event.target.value)
                }}
              />
            </label>
            <button
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              onClick={() => {
                void create()
              }}
            >
              Create workflow
            </button>
            {message ? (
              <p className="text-sm text-muted-foreground" role="status">
                {message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
