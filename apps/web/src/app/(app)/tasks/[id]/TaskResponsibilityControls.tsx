'use client'

import { TASK_RESPONSIBILITY_COPY } from '../../../../i18n/task-responsibility-copy'
import type { Locale } from '../../../../i18n/config'
import { TaskAssignmentSection } from './TaskAssignmentSection'
import { TaskBlockerSection } from './TaskBlockerSection'
import type { TaskPerson } from './task-responsibility-shared'

function ReadonlyRoleDetails({
  primaryAssigneeId,
  collaboratorIds,
  watcherIds,
  blockedReason,
  waitingOnId,
  people,
  copy,
}: Readonly<{
  primaryAssigneeId: string | null
  collaboratorIds: readonly string[]
  watcherIds: readonly string[]
  blockedReason: string | null
  waitingOnId: string | null
  people: readonly TaskPerson[]
  copy: (typeof TASK_RESPONSIBILITY_COPY)['en']
}>) {
  const namesFor = (ids: readonly string[]) =>
    ids
      .map((id) => people.find((person) => person.id === id)?.name)
      .filter((name): name is string => name !== undefined)
  const roleValue = (label: string, names: readonly string[]) =>
    copy.roleValue.replace('{label}', label).replace('{value}', names.join(', ') || copy.unassigned)
  return (
    <div className="grid gap-1 text-xs text-muted-foreground">
      <p>{roleValue(copy.responsible, primaryAssigneeId === null ? [] : namesFor([primaryAssigneeId]))}</p>
      <p>{roleValue(copy.collaborators, namesFor(collaboratorIds))}</p>
      <p>{roleValue(copy.watchers, namesFor(watcherIds))}</p>
      {blockedReason ? <p>{roleValue(copy.blockerReason, [blockedReason])}</p> : null}
      {blockedReason ? <p>{roleValue(copy.waitingOn, waitingOnId === null ? [] : namesFor([waitingOnId]))}</p> : null}
    </div>
  )
}

export function TaskResponsibilityControls({
  taskId,
  updatedAt,
  primaryAssigneeId,
  collaboratorIds,
  watcherIds,
  assignedById,
  blockedReason,
  waitingOnId,
  people,
  canUpdate,
  locale,
}: Readonly<{
  taskId: string
  updatedAt: number
  primaryAssigneeId: string | null
  collaboratorIds: readonly string[]
  watcherIds: readonly string[]
  assignedById: string | null
  blockedReason: string | null
  waitingOnId: string | null
  people: readonly TaskPerson[]
  canUpdate: boolean
  locale: Locale
}>) {
  const copy = TASK_RESPONSIBILITY_COPY[locale]
  const assigner = people.find((person) => person.id === assignedById)?.name
  const shared = { taskId, updatedAt, people, locale }
  return (
    <section className="grid gap-3 rounded-lg border p-3" aria-label={copy.responsibility}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{copy.responsibility}</h3>
        {blockedReason ? (
          <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            {copy.blocked}
          </span>
        ) : null}
      </div>
      {assigner ? <p className="text-xs text-muted-foreground">{copy.assignedBy.replace('{name}', assigner)}</p> : null}
      <ReadonlyRoleDetails
        primaryAssigneeId={primaryAssigneeId}
        collaboratorIds={collaboratorIds}
        watcherIds={watcherIds}
        blockedReason={blockedReason}
        waitingOnId={waitingOnId}
        people={people}
        copy={copy}
      />
      {canUpdate ? (
        <>
          <TaskAssignmentSection
            {...shared}
            primaryAssigneeId={primaryAssigneeId}
            collaboratorIds={collaboratorIds}
            watcherIds={watcherIds}
          />
          <TaskBlockerSection {...shared} blockedReason={blockedReason} waitingOnId={waitingOnId} />
        </>
      ) : null}
    </section>
  )
}
