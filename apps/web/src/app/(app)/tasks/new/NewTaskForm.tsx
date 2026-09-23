'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { createTask } from '../../../../server/actions/work/tasks/createTask'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'

type Option = Readonly<{ value: string; label: string }>
type FormProps = Readonly<{ projects: readonly Option[]; projectId: string; initialTitle: string }>

function stringField(form: FormData, field: Readonly<{ name: string; fallback?: string }>): string {
  const value = form.get(field.name)
  return typeof value === 'string' ? value : (field.fallback ?? '')
}

function taskInput(form: FormData, context: Readonly<{ relatedType: string | null; relatedId: string | null }>) {
  const dueDate = stringField(form, { name: 'dueAt' })
  return {
    title: stringField(form, { name: 'title' }).trim(),
    description: stringField(form, { name: 'description' }).trim() || null,
    priority: stringField(form, { name: 'priority', fallback: 'none' }),
    projectId: stringField(form, { name: 'projectId' }) || null,
    ...context,
    dueAt: dueDate === '' ? null : Date.parse(`${dueDate}T00:00:00.000Z`),
  }
}

function TaskCoreFields({ projects, projectId, initialTitle }: FormProps) {
  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-title">
        Task title
        <Input id="task-title" name="title" required maxLength={300} autoFocus defaultValue={initialTitle} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-project">
        Project
        <select
          id="task-project"
          name="projectId"
          defaultValue={projectId}
          className="h-10 rounded-md border bg-background px-3 text-sm font-normal"
        >
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.value} value={project.value}>
              {project.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function TaskScheduleFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-priority">
        Priority
        <select
          id="task-priority"
          name="priority"
          defaultValue="none"
          className="h-10 rounded-md border bg-background px-3 text-sm font-normal"
        >
          <option value="none">No priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-due-date">
        Due date
        <Input id="task-due-date" name="dueAt" type="date" />
      </label>
    </div>
  )
}

function TaskFormActions({ pending, cancel }: Readonly<{ pending: boolean; cancel: () => void }>) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          cancel()
        }}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create task'}
      </Button>
    </div>
  )
}

export function NewTaskForm({
  projects,
  projectId,
  relatedType,
  relatedId,
  relatedLabel,
  initialTitle,
  cancelHref,
}: Readonly<{
  projects: readonly Option[]
  projectId: string
  relatedType: string | null
  relatedId: string | null
  relatedLabel: string | null
  initialTitle: string
  cancelHref: string
}>) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      const result = await createTask(taskInput(form, { relatedType, relatedId }))
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push(`/tasks/${result.data.id}`)
      router.refresh()
    } catch {
      setError('Unable to create task. Try again.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className="ops-detail-card grid max-w-2xl gap-5 rounded-lg border bg-card p-5"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {relatedLabel === null ? null : (
        <p className="text-sm text-muted-foreground">
          Linked to <span className="font-medium text-foreground">{relatedLabel}</span>
        </p>
      )}
      <TaskCoreFields projects={projects} projectId={projectId} initialTitle={initialTitle} />
      <TaskScheduleFields />
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-description">
        Description
        <Textarea id="task-description" name="description" maxLength={20000} rows={5} />
      </label>
      {error === null ? null : (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <TaskFormActions
        pending={pending}
        cancel={() => {
          router.push(cancelHref)
        }}
      />
    </form>
  )
}
