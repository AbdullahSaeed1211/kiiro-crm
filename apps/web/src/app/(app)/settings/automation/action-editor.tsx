'use client'

import {
  ACTION_KINDS,
  TASK_ASSIGNEES,
  type ActionKind,
  type RuleAction,
  type TaskAssignee,
} from '@ops/module-automation'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useId } from 'react'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { AUTOMATION_COPY, type AutomationCopy } from '../../../../i18n/automation-copy'
import type { Choice } from './types'

type TaskAction = Extract<RuleAction, { kind: 'create_task' }>
type PersonAction = Extract<RuleAction, { kind: 'assign_owner' | 'notify' }>

/** A fresh action of the chosen kind; a person action starts with the first active person. */
export function newAction(kind: ActionKind, people: readonly Choice[]): RuleAction {
  const userId = people[0]?.id ?? ''
  switch (kind) {
    case 'create_task':
      return { kind, title: '', dueInDays: 1, assignee: 'record_owner' }
    case 'assign_owner':
      return { kind, userId }
    case 'notify':
      return { kind, userId }
  }
}

function TaskFields({
  action,
  copy,
  onChange,
}: Readonly<{ action: TaskAction; copy: AutomationCopy; onChange: (next: TaskAction) => void }>) {
  const group = useId()
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid min-w-56 flex-1 gap-1 text-xs">
        <span className="font-medium">{copy.taskTitle}</span>
        <Input
          value={action.title}
          maxLength={300}
          onChange={(event) => {
            onChange({ ...action, title: event.target.value })
          }}
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">{copy.dueInDays}</span>
        <Input
          type="number"
          min={0}
          max={365}
          className="w-24"
          value={action.dueInDays}
          onChange={(event) => {
            onChange({ ...action, dueInDays: Number(event.target.value) })
          }}
        />
      </label>
      <fieldset className="grid gap-1 text-xs">
        <legend className="font-medium">{copy.assignee}</legend>
        <div className="flex gap-3">
          {TASK_ASSIGNEES.map((assignee: TaskAssignee) => (
            <label key={assignee} className="flex items-center gap-1">
              <input
                type="radio"
                name={group}
                checked={action.assignee === assignee}
                onChange={() => {
                  onChange({ ...action, assignee })
                }}
              />
              {copy.assignees[assignee]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

function PersonPicker({
  action,
  people,
  copy,
  onChange,
}: Readonly<{
  action: PersonAction
  people: readonly Choice[]
  copy: AutomationCopy
  onChange: (next: RuleAction) => void
}>) {
  return (
    <label className="grid max-w-64 gap-1 text-xs">
      <span className="font-medium">{copy.person}</span>
      <NativeSelect
        value={action.userId}
        onChange={(event) => {
          onChange({ ...action, userId: event.target.value })
        }}
      >
        <option value="">{copy.chooseValue}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

function ActionFields({
  action,
  people,
  copy,
  onChange,
}: Readonly<{
  action: RuleAction
  people: readonly Choice[]
  copy: AutomationCopy
  onChange: (next: RuleAction) => void
}>) {
  switch (action.kind) {
    case 'create_task':
      return <TaskFields action={action} copy={copy} onChange={onChange} />
    case 'assign_owner':
    case 'notify':
      return <PersonPicker action={action} people={people} copy={copy} onChange={onChange} />
  }
}

/** One action: its kind, then only the inputs that kind needs. */
export function ActionEditor({
  action,
  people,
  onChange,
  onRemove,
}: Readonly<{
  action: RuleAction
  people: readonly Choice[]
  onChange: (next: RuleAction) => void
  onRemove: () => void
}>) {
  const copy = catalogFor(AUTOMATION_COPY, useLocale())
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <NativeSelect
          aria-label={copy.actionsTitle}
          value={action.kind}
          onChange={(event) => {
            onChange(newAction(event.target.value as ActionKind, people))
          }}
        >
          {ACTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {copy.actions[kind]}
            </option>
          ))}
        </NativeSelect>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          {copy.removeAction}
        </Button>
      </div>
      <ActionFields action={action} people={people} copy={copy} onChange={onChange} />
    </div>
  )
}
