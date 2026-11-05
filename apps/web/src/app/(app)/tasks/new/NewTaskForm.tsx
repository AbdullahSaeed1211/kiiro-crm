'use client'

import { Button } from '@ops/ui/components/ui/button'
import { createTask } from '../../../../server/actions/work/tasks/createTask'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import { taskFormLabels, type TaskFormLabels } from '../../../../i18n/task-form-copy'
import { useLocale } from '../../../../i18n/locale-context'
import type { TaskRepeat } from '@ops/module-work'
import { LinkedTo, TaskCoreFields, TaskDetails, TaskWhoFields, type Option } from './NewTaskFields'

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
    repeat: dueDate === '' ? 'none' : stringField(form, { name: 'repeat', fallback: 'none' }),
    projectId: stringField(form, { name: 'projectId' }) || null,
    ...(stringField(form, { name: 'assigneeId' }) === ''
      ? {}
      : { assigneeIds: [stringField(form, { name: 'assigneeId' })] }),
    ...context,
    dueAt: dueDate === '' ? null : Date.parse(`${dueDate}T00:00:00.000Z`),
  }
}

function TaskFormActions({
  pending,
  cancel,
  copy,
}: Readonly<{ pending: boolean; cancel: () => void; copy: TaskFormLabels }>) {
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
        {copy.cancel}
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? copy.creating : copy.create}
      </Button>
    </div>
  )
}

/** Saves the form through `createTask` and opens the new task; a client picked on the form becomes the task's context. */
function useCreateTask({
  router,
  failed,
  context,
  ownerOnly,
}: Readonly<{
  router: ReturnType<typeof useRouter>
  failed: string
  context: Readonly<{ relatedType: string | null; relatedId: string | null; linked: boolean; clientId: string }>
  ownerOnly: Readonly<{ ownerOnly?: boolean }>
}>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    const related =
      !context.linked && context.clientId !== ''
        ? { relatedType: 'organization', relatedId: context.clientId }
        : { relatedType: context.relatedType, relatedId: context.relatedId }
    try {
      const result = await createTask({ ...taskInput(new FormData(event.currentTarget), related), ...ownerOnly })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push(`/tasks/${result.data.id}`)
      router.refresh()
    } catch {
      setError(failed)
    } finally {
      setPending(false)
    }
  }
  return { pending, error, submit }
}

export function NewTaskForm({
  projects,
  people,
  projectId,
  relatedType,
  relatedId,
  relatedLabel,
  initialTitle,
  initialRepeat = 'none',
  cancelHref,
  canMarkOwnerOnly,
}: Readonly<{
  projects: readonly Option[]
  /** Who the task can be assigned to; empty for staff, who keep their own tasks. */
  people: readonly Option[]
  projectId: string
  relatedType: string | null
  relatedId: string | null
  relatedLabel: string | null
  initialTitle: string
  initialRepeat?: TaskRepeat
  cancelHref: string
  canMarkOwnerOnly: boolean
}>) {
  const router = useRouter()
  const copy = taskFormLabels(useLocale())
  const [ownerOnly, setOwnerOnly] = useState(false)
  const [clientId, setClientId] = useState('')
  const { pending, error, submit } = useCreateTask({
    router,
    failed: copy.failed,
    context: { relatedType, relatedId, linked: relatedLabel !== null, clientId },
    ownerOnly: canMarkOwnerOnly ? { ownerOnly } : {},
  })
  return (
    <form
      className="ops-detail-card grid max-w-2xl gap-5 rounded-lg border bg-card p-5"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {relatedLabel === null ? null : <LinkedTo template={copy.linkedTo} name={relatedLabel} />}
      <TaskCoreFields projects={projects} projectId={projectId} initialTitle={initialTitle} copy={copy} />
      <TaskWhoFields copy={copy} people={people} showClient={relatedLabel === null} onClient={setClientId} />
      <TaskDetails
        copy={copy}
        initialRepeat={initialRepeat}
        canMarkOwnerOnly={canMarkOwnerOnly}
        ownerOnly={ownerOnly}
        onOwnerOnly={setOwnerOnly}
      />
      {error === null ? null : (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <TaskFormActions
        copy={copy}
        pending={pending}
        cancel={() => {
          router.push(cancelHref)
        }}
      />
    </form>
  )
}
