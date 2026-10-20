'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { createTask } from '../../../../server/actions/work/tasks/createTask'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import { taskFormLabels, type TaskFormLabels } from '../../../../i18n/task-form-copy'
import { useLocale } from '../../../../i18n/locale-context'

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
    repeat: dueDate === '' ? 'none' : stringField(form, { name: 'repeat', fallback: 'none' }),
    projectId: stringField(form, { name: 'projectId' }) || null,
    ...context,
    dueAt: dueDate === '' ? null : Date.parse(`${dueDate}T00:00:00.000Z`),
  }
}

function TaskCoreFields({ projects, projectId, initialTitle, copy }: FormProps & Readonly<{ copy: TaskFormLabels }>) {
  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-title">
        {copy.title}
        <Input id="task-title" name="title" required maxLength={300} autoFocus defaultValue={initialTitle} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-project">
        {copy.project}
        <NativeSelect id="task-project" name="projectId" defaultValue={projectId} className="w-full font-normal">
          <option value="">{copy.noProject}</option>
          {projects.map((project) => (
            <option key={project.value} value={project.value}>
              {project.label}
            </option>
          ))}
        </NativeSelect>
      </label>
    </>
  )
}

function TaskScheduleFields({ copy }: Readonly<{ copy: TaskFormLabels }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-priority">
        {copy.priority}
        <NativeSelect id="task-priority" name="priority" defaultValue="none" className="w-full font-normal">
          <option value="none">{copy.priorityNone}</option>
          <option value="low">{copy.priorityLow}</option>
          <option value="medium">{copy.priorityMedium}</option>
          <option value="high">{copy.priorityHigh}</option>
          <option value="urgent">{copy.priorityUrgent}</option>
        </NativeSelect>
      </label>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-due-date">
        {copy.dueDate}
        <Input id="task-due-date" name="dueAt" type="date" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-repeat">
        {copy.repeats}
        <NativeSelect id="task-repeat" name="repeat" defaultValue="none" className="w-full font-normal">
          <option value="none">{copy.repeatNone}</option>
          <option value="daily">{copy.repeatDaily}</option>
          <option value="weekly">{copy.repeatWeekly}</option>
          <option value="biweekly">{copy.repeatBiweekly}</option>
          <option value="monthly">{copy.repeatMonthly}</option>
          <option value="quarterly">{copy.repeatQuarterly}</option>
          <option value="yearly">{copy.repeatYearly}</option>
        </NativeSelect>
        <span className="text-xs font-normal text-muted-foreground">{copy.repeatHelp}</span>
      </label>
    </div>
  )
}

function OwnerOnlyField({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <Checkbox
        checked={checked}
        onCheckedChange={(next: boolean) => {
          onChange(next)
        }}
      />
      {label}
    </label>
  )
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

/** "Linked to <name>" with the name emphasized; `{name}` marks where it goes in the translated template. */
function LinkedTo({ template, name }: Readonly<{ template: string; name: string }>) {
  const [before = '', after = ''] = template.split('{name}')
  return (
    <p className="text-sm text-muted-foreground">
      {before}
      <span className="font-medium text-foreground">{name}</span>
      {after}
    </p>
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
  canMarkOwnerOnly,
}: Readonly<{
  projects: readonly Option[]
  projectId: string
  relatedType: string | null
  relatedId: string | null
  relatedLabel: string | null
  initialTitle: string
  cancelHref: string
  canMarkOwnerOnly: boolean
}>) {
  const router = useRouter()
  const copy = taskFormLabels(useLocale())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerOnly, setOwnerOnly] = useState(false)
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const input = { ...taskInput(form, { relatedType, relatedId }), ...(canMarkOwnerOnly ? { ownerOnly } : {}) }
    try {
      const result = await createTask(input)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push(`/tasks/${result.data.id}`)
      router.refresh()
    } catch {
      setError(copy.failed)
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
      {relatedLabel === null ? null : <LinkedTo template={copy.linkedTo} name={relatedLabel} />}
      <TaskCoreFields projects={projects} projectId={projectId} initialTitle={initialTitle} copy={copy} />
      <TaskScheduleFields copy={copy} />
      {canMarkOwnerOnly ? <OwnerOnlyField label={copy.ownerOnly} checked={ownerOnly} onChange={setOwnerOnly} /> : null}
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-description">
        {copy.description}
        <Textarea id="task-description" name="description" maxLength={20000} rows={5} />
      </label>
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
