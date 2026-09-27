'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import Link from 'next/link'
import { useState, type SyntheticEvent } from 'react'
import type { TaskSheetActions, TaskSheetLabels, TaskSheetTask } from './types'

type SubtasksProps = Readonly<{
  task: TaskSheetTask
  labels: TaskSheetLabels
  actions: TaskSheetActions
  canUpdate: boolean
}>

function useAddSubtask({ task, actions }: Pick<SubtasksProps, 'task' | 'actions'>) {
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    const trimmed = title.trim()
    if (trimmed === '') return
    setPending(true)
    setError(null)
    const result = await actions.onCreateSubtask(task.id, trimmed)
    setPending(false)
    if (!result.ok) {
      setError(result.fields?.['parentTaskId'] ?? result.fields?.['title'] ?? result.message)
      return
    }
    setTitle('')
  }
  return { title, setTitle, pending, error, submit }
}

/** Subtask list: each row opens its task, the box completes or reopens it, and the form adds one. */
export function TaskSubtasks({ task, labels, actions, canUpdate }: SubtasksProps) {
  const add = useAddSubtask({ task, actions })
  const done = task.subtasks.filter((item) => item.complete).length
  const onSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    void add.submit()
  }
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">{labels.subtasks}</h3>
        <span className="text-xs text-muted-foreground">
          {done}/{task.subtasks.length}
        </span>
      </div>
      {task.subtasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.noSubtasks}</p>
      ) : (
        <ul className="space-y-1.5">
          {task.subtasks.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.complete}
                disabled={!canUpdate}
                aria-label={item.complete ? labels.reopen : labels.complete}
                onCheckedChange={() => {
                  void actions.onChange({
                    taskId: item.id,
                    expectedUpdatedAt: item.updatedAt,
                    change: { kind: 'complete', reopen: item.complete },
                  })
                }}
              />
              <Link
                href={actions.taskHref(item.id)}
                className={item.complete ? 'text-muted-foreground line-through hover:underline' : 'hover:underline'}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {canUpdate ? (
        <form className="mt-2 flex gap-2" onSubmit={onSubmit}>
          <Input
            value={add.title}
            onChange={(event) => {
              add.setTitle(event.target.value)
            }}
            placeholder={labels.addSubtaskPlaceholder}
            aria-label={labels.addSubtask}
            className="h-8"
          />
          <Button type="submit" size="sm" variant="outline" disabled={add.pending || add.title.trim() === ''}>
            {add.pending ? labels.saving : labels.addSubtask}
          </Button>
        </form>
      ) : null}
      {add.error === null ? null : (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {add.error}
        </p>
      )}
    </section>
  )
}
