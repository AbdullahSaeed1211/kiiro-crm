'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { StageSelect } from '../StageSelect/StageSelect'
import { DateField } from '../DateField/DateField'
import {
  TASK_PRIORITIES,
  TASK_REPEATS,
  type TaskChange,
  type TaskPriority,
  type TaskRepeat,
  type TaskSheetActions,
  type TaskSheetLabels,
  type TaskSheetOptions,
  type TaskSheetTask,
} from './types'

type PropertiesProps = Readonly<{
  task: TaskSheetTask
  options: TaskSheetOptions
  labels: TaskSheetLabels
  taskHref: TaskSheetActions['taskHref']
  busy: boolean
  fields: Readonly<Record<string, string>>
  onSave: (change: TaskChange) => void
}>

function Property({
  label,
  error,
  children,
}: Readonly<{ label: string; error?: string | undefined; children: ReactNode }>) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-3 text-sm">
      <span className="pt-1.5 text-muted-foreground">{label}</span>
      <div className="min-w-0">
        {children}
        {error === undefined ? null : (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

function PrioritySelect({
  task,
  labels,
  disabled,
  onSave,
}: Readonly<Omit<PropertiesProps, 'options' | 'taskHref' | 'fields' | 'busy'> & { disabled: boolean }>) {
  return (
    <Select
      value={task.priority}
      disabled={disabled}
      onValueChange={(next: string | null) => {
        const priority = TASK_PRIORITIES.find((item) => item === next)
        if (priority !== undefined && priority !== task.priority) onSave({ kind: 'priority', priority })
      }}
    >
      <SelectTrigger size="sm" aria-label={labels.priority} className="w-full">
        <SelectValue>{(value: TaskPriority) => labels.priorities[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {TASK_PRIORITIES.map((priority) => (
          <SelectItem key={priority} value={priority}>
            {labels.priorities[priority]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RepeatSelect({
  task,
  labels,
  disabled,
  onSave,
}: Readonly<Omit<PropertiesProps, 'options' | 'taskHref' | 'fields' | 'busy'> & { disabled: boolean }>) {
  return (
    <Select
      value={task.repeat}
      disabled={disabled}
      onValueChange={(next: string | null) => {
        const repeat = TASK_REPEATS.find((item) => item === next)
        if (repeat !== undefined && repeat !== task.repeat) onSave({ kind: 'repeat', repeat })
      }}
    >
      <SelectTrigger size="sm" aria-label={labels.repeat} className="w-full">
        <SelectValue>{(value: TaskRepeat) => labels.repeats[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {TASK_REPEATS.map((repeat) => (
          <SelectItem key={repeat} value={repeat}>
            {labels.repeats[repeat]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AssigneeSelect({
  task,
  options,
  labels,
  disabled,
  onSave,
}: Readonly<Omit<PropertiesProps, 'taskHref' | 'fields' | 'busy'> & { disabled: boolean }>) {
  const names = new Map(options.members.map((member) => [member.id, member.name]))
  return (
    <Select
      multiple
      value={[...task.assigneeIds]}
      disabled={disabled}
      onValueChange={(next: string[]) => {
        onSave({ kind: 'assignees', assigneeIds: next })
      }}
    >
      <SelectTrigger size="sm" aria-label={labels.assignees} className="w-full">
        <SelectValue>
          {(value: string[]) =>
            value.length === 0 ? labels.unassigned : value.map((id) => names.get(id) ?? id).join(', ')
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {options.members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Stage, priority, assignees, dates and parent; each control saves on change (spec §17.5). */
export function TaskProperties({ task, options, labels, taskHref, busy, fields, onSave }: PropertiesProps) {
  const disabled = busy || !options.canUpdate
  return (
    <section aria-label={labels.properties} className="max-w-2xl space-y-2.5">
      <Property label={labels.stage.label} error={fields['toStageId']}>
        <StageSelect
          stages={options.stages}
          value={task.stageId}
          labels={labels.stage}
          size="sm"
          className="w-full"
          disabled={disabled}
          onChange={(stageId) => {
            onSave({ kind: 'stage', stageId })
          }}
        />
      </Property>
      <Property label={labels.priority} error={fields['priority']}>
        <PrioritySelect task={task} labels={labels} disabled={disabled} onSave={onSave} />
      </Property>
      <Property label={labels.repeat} error={fields['repeat']}>
        <RepeatSelect task={task} labels={labels} disabled={disabled} onSave={onSave} />
      </Property>
      <Property label={labels.assignees} error={fields['assigneeIds']}>
        <AssigneeSelect task={task} options={options} labels={labels} disabled={disabled} onSave={onSave} />
      </Property>
      <Property label={labels.startDate} error={fields['startAt']}>
        <DateField
          label={labels.startDate}
          value={task.startAt}
          locale={options.locale}
          placeholder={labels.noDate}
          clearLabel={labels.clearDate}
          disabled={disabled}
          onChange={(startAt) => {
            onSave({ kind: 'dates', startAt, dueAt: task.dueAt })
          }}
        />
      </Property>
      <Property label={labels.dueDate} error={fields['dueAt']}>
        <DateField
          label={labels.dueDate}
          value={task.dueAt}
          locale={options.locale}
          placeholder={labels.noDate}
          clearLabel={labels.clearDate}
          disabled={disabled}
          onChange={(dueAt) => {
            onSave({ kind: 'dates', startAt: task.startAt, dueAt })
          }}
        />
      </Property>
      <Property label={labels.parent}>
        {task.parent === null ? (
          <span className="block pt-1.5 text-muted-foreground">{labels.noParent}</span>
        ) : (
          <Link href={taskHref(task.parent.id)} className="block pt-1.5 font-medium hover:text-primary hover:underline">
            {task.parent.title}
          </Link>
        )}
      </Property>
    </section>
  )
}
