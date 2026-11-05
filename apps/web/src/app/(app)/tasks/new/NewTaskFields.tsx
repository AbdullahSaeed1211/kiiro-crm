'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useState } from 'react'
import type { TaskRepeat } from '@ops/module-work'
import type { TaskFormLabels } from '../../../../i18n/task-form-copy'
import { RecordPicker } from '../../RecordPicker'

export type Option = Readonly<{ value: string; label: string }>
export type FormProps = Readonly<{ projects: readonly Option[]; projectId: string; initialTitle: string }>

export function TaskCoreFields({
  projects,
  projectId,
  initialTitle,
  copy,
}: FormProps & Readonly<{ copy: TaskFormLabels }>) {
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

/** Who the task is for and which client it belongs to. Owners and managers may assign anyone; staff keep their own. */
export function TaskWhoFields({
  copy,
  people,
  showClient,
  onClient,
}: Readonly<{ copy: TaskFormLabels; people: readonly Option[]; showClient: boolean; onClient: (id: string) => void }>) {
  if (people.length === 0 && !showClient) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showClient ? (
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-client">
          {copy.client}
          <RecordPicker
            id="task-client"
            name="client"
            type="organization"
            emptyLabel={copy.noClient}
            onChoose={(option) => {
              onClient(option?.id ?? '')
            }}
          />
        </label>
      ) : null}
      {people.length === 0 ? null : (
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-assignee">
          {copy.assignedTo}
          <NativeSelect id="task-assignee" name="assigneeId" defaultValue="" className="w-full font-normal">
            <option value="">{copy.assignedToMe}</option>
            {people.map((person) => (
              <option key={person.value} value={person.value}>
                {person.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
    </div>
  )
}

export function TaskScheduleFields({
  copy,
  initialRepeat,
}: Readonly<{ copy: TaskFormLabels; initialRepeat: TaskRepeat }>) {
  const [repeat, setRepeat] = useState(initialRepeat)
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
        <Input id="task-due-date" name="dueAt" type="date" required={repeat !== 'none'} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-repeat">
        {copy.repeats}
        <NativeSelect
          id="task-repeat"
          name="repeat"
          value={repeat}
          onChange={(event) => {
            setRepeat(event.target.value as TaskRepeat)
          }}
          className="w-full font-normal"
        >
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

export function OwnerOnlyField({
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

/** "Linked to <name>" with the name emphasized; `{name}` marks where it goes in the translated template. */
export function LinkedTo({ template, name }: Readonly<{ template: string; name: string }>) {
  const [before = '', after = ''] = template.split('{name}')
  return (
    <p className="text-sm text-muted-foreground">
      {before}
      <span className="font-medium text-foreground">{name}</span>
      {after}
    </p>
  )
}

export function TaskDetails({
  copy,
  initialRepeat,
  canMarkOwnerOnly,
  ownerOnly,
  onOwnerOnly,
}: Readonly<{
  copy: TaskFormLabels
  initialRepeat: TaskRepeat
  canMarkOwnerOnly: boolean
  ownerOnly: boolean
  onOwnerOnly: (value: boolean) => void
}>) {
  return (
    <details open={initialRepeat !== 'none'} className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">{copy.moreDetails}</summary>
      <div className="mt-4 grid gap-4">
        <TaskScheduleFields copy={copy} initialRepeat={initialRepeat} />
        {canMarkOwnerOnly ? <OwnerOnlyField label={copy.ownerOnly} checked={ownerOnly} onChange={onOwnerOnly} /> : null}
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-description">
          {copy.description}
          <Textarea id="task-description" name="description" maxLength={20000} rows={4} />
        </label>
      </div>
    </details>
  )
}
