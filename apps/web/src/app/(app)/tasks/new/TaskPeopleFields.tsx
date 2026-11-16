'use client'

import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useState } from 'react'
import type { TaskFormLabels } from '../../../../i18n/task-form-copy'
import type { Option } from './task-form-types'

type Role = 'collaborator' | 'watcher'
type RoleToggle = Readonly<{ id: string; checked: boolean; role: Role }>

function effectivePrimary(responsible: string, actorId: string): string {
  if (responsible === '') return actorId
  if (responsible === 'none') return ''
  return responsible
}

function withoutPerson(people: ReadonlySet<string>, id: string): Set<string> {
  return new Set([...people].filter((personId) => personId !== id))
}

function RoleFieldset({
  name,
  title,
  people,
  selected,
  primaryId,
  disabledIds,
  toggle,
}: Readonly<{
  name: string
  title: string
  people: readonly Option[]
  selected: ReadonlySet<string>
  primaryId: string
  disabledIds?: ReadonlySet<string>
  toggle: (input: RoleToggle) => void
}>) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{title}</legend>
      {people.map((person) => (
        <label key={`${name}:${person.value}`} className="flex items-center gap-2 text-sm font-normal">
          <Checkbox
            name={name}
            value={person.value}
            checked={selected.has(person.value)}
            disabled={person.value === primaryId || (disabledIds?.has(person.value) ?? false)}
            onCheckedChange={(checked) => {
              toggle({ id: person.value, checked, role: name === 'collaboratorIds' ? 'collaborator' : 'watcher' })
            }}
          />
          {person.label}
        </label>
      ))}
    </fieldset>
  )
}

export function TaskPeopleFields({
  copy,
  people,
  actorId,
}: Readonly<{ copy: TaskFormLabels; people: readonly Option[]; actorId: string }>) {
  const [responsible, setResponsible] = useState('')
  const [collaborators, setCollaborators] = useState(() => new Set<string>())
  const [watchers, setWatchers] = useState(() => new Set<string>())
  const primaryId = effectivePrimary(responsible, actorId)

  function changeResponsible(id: string) {
    setResponsible(id)
    setCollaborators((current) => withoutPerson(current, id))
    setWatchers((current) => withoutPerson(current, id))
  }

  function toggle(input: RoleToggle) {
    const selected = input.role === 'collaborator' ? collaborators : watchers
    const other = input.role === 'collaborator' ? watchers : collaborators
    const nextSelected = new Set(selected)
    if (input.checked) nextSelected.add(input.id)
    else nextSelected.delete(input.id)
    const nextOther = input.checked ? withoutPerson(other, input.id) : new Set(other)
    if (input.role === 'collaborator') {
      setCollaborators(nextSelected)
      setWatchers(nextOther)
    } else {
      setWatchers(nextSelected)
      setCollaborators(nextOther)
    }
  }

  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="task-assignee">
        {copy.assignedTo}
        <NativeSelect
          id="task-assignee"
          name="primaryAssigneeId"
          value={responsible}
          onChange={(event) => {
            changeResponsible(event.target.value)
          }}
          className="w-full font-normal"
        >
          <option value="">{copy.assignedToMe}</option>
          <option value="none">{copy.unassigned}</option>
          {people.map((person) => (
            <option key={person.value} value={person.value}>
              {person.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      {people.length < 2 ? null : (
        <details className="rounded-lg border p-3 sm:col-span-2">
          <summary className="cursor-pointer text-sm font-medium">{copy.peopleDetails}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <RoleFieldset
              name="collaboratorIds"
              title={copy.collaborators}
              people={people}
              selected={collaborators}
              primaryId={primaryId}
              toggle={toggle}
            />
            <RoleFieldset
              name="watcherIds"
              title={copy.watchers}
              people={people}
              selected={watchers}
              primaryId={primaryId}
              disabledIds={collaborators}
              toggle={toggle}
            />
          </div>
        </details>
      )}
    </>
  )
}
