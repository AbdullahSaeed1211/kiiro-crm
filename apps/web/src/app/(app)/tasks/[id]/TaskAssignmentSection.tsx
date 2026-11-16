'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TASK_RESPONSIBILITY_COPY } from '../../../../i18n/task-responsibility-copy'
import {
  membership,
  saveTaskPatch,
  withoutPerson,
  type TaskPerson,
  type TaskResponsibilityProps,
} from './task-responsibility-shared'

function PeopleChecks({
  title,
  people,
  selected,
  disabledId,
  onToggle,
}: Readonly<{
  title: string
  people: readonly TaskPerson[]
  selected: ReadonlySet<string>
  disabledId: string
  onToggle: (id: string, checked: boolean) => void
}>) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{title}</legend>
      {people.map((person) => (
        <label key={`${title}:${person.id}`} className="flex items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={selected.has(person.id)}
            disabled={person.id === disabledId}
            onCheckedChange={(checked) => {
              onToggle(person.id, checked)
            }}
          />
          {person.name}
        </label>
      ))}
    </fieldset>
  )
}

function AssignmentForm({
  copy,
  people,
  responsible,
  collaborators,
  watchers,
  pending,
  failed,
  changeResponsible,
  toggleCollaborator,
  toggleWatcher,
  save,
}: Readonly<{
  copy: (typeof TASK_RESPONSIBILITY_COPY)['en']
  people: readonly TaskPerson[]
  responsible: string
  collaborators: ReadonlySet<string>
  watchers: ReadonlySet<string>
  pending: boolean
  failed: boolean
  changeResponsible: (id: string) => void
  toggleCollaborator: (id: string, checked: boolean) => void
  toggleWatcher: (id: string, checked: boolean) => void
  save: () => void
}>) {
  return (
    <div className="mt-3 grid gap-3">
      <label className="grid gap-1.5 text-sm font-medium">
        {copy.responsible}
        <NativeSelect
          value={responsible}
          onChange={(event) => {
            changeResponsible(event.target.value)
          }}
          className="w-full font-normal"
        >
          <option value="">{copy.unassigned}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </NativeSelect>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <PeopleChecks
          title={copy.collaborators}
          people={people}
          selected={collaborators}
          disabledId={responsible}
          onToggle={toggleCollaborator}
        />
        <PeopleChecks
          title={copy.watchers}
          people={people}
          selected={watchers}
          disabledId={responsible}
          onToggle={toggleWatcher}
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          save()
        }}
      >
        {copy.saveAssignment}
      </Button>
      {failed ? (
        <p role="alert" className="text-xs text-destructive">
          {copy.failed}
        </p>
      ) : null}
    </div>
  )
}

export function TaskAssignmentSection({
  taskId,
  updatedAt,
  people,
  locale,
  primaryAssigneeId,
  collaboratorIds,
  watcherIds,
}: TaskResponsibilityProps &
  Readonly<{
    primaryAssigneeId: string | null
    collaboratorIds: readonly string[]
    watcherIds: readonly string[]
  }>) {
  const copy = TASK_RESPONSIBILITY_COPY[locale]
  const router = useRouter()
  const [responsible, setResponsible] = useState(primaryAssigneeId ?? '')
  const [collaborators, setCollaborators] = useState(() => new Set(collaboratorIds))
  const [watchers, setWatchers] = useState(() => new Set(watcherIds))
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  function setResponsibleAndRemoveOverlap(id: string) {
    setResponsible(id)
    setCollaborators((current) => withoutPerson(current, id))
    setWatchers((current) => withoutPerson(current, id))
  }

  function toggleCollaborator(id: string, checked: boolean) {
    setCollaborators((current) => membership({ current, id, checked }))
    if (checked) setWatchers((current) => withoutPerson(current, id))
  }

  function toggleWatcher(id: string, checked: boolean) {
    setWatchers((current) => membership({ current, id, checked }))
    if (checked) setCollaborators((current) => withoutPerson(current, id))
  }

  async function save() {
    if (pending) return
    setPending(true)
    setFailed(false)
    const ok = await saveTaskPatch({
      taskId,
      updatedAt,
      patch: {
        primaryAssigneeId: responsible || null,
        collaboratorIds: [...collaborators].filter((id) => id !== responsible),
        watcherIds: [...watchers].filter((id) => id !== responsible && !collaborators.has(id)),
      },
    })
    if (ok) router.refresh()
    else setFailed(true)
    setPending(false)
  }

  return (
    <details>
      <summary className="cursor-pointer text-sm text-muted-foreground">{copy.assignmentDetails}</summary>
      <AssignmentForm
        copy={copy}
        people={people}
        responsible={responsible}
        collaborators={collaborators}
        watchers={watchers}
        pending={pending}
        failed={failed}
        changeResponsible={setResponsibleAndRemoveOverlap}
        toggleCollaborator={toggleCollaborator}
        toggleWatcher={toggleWatcher}
        save={() => {
          void save()
        }}
      />
    </details>
  )
}
