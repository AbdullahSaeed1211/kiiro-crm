import type { Dispatch, SetStateAction } from 'react'
import { updateTask } from '@/server/actions/work/tasks/updateTask'
import type { Locale } from '../../../../i18n/config'

export type TaskPerson = Readonly<{ id: string; name: string }>
export type TaskResponsibilityProps = Readonly<{
  taskId: string
  updatedAt: number
  people: readonly TaskPerson[]
  locale: Locale
}>

export async function saveTaskPatch(
  input: Readonly<{
    taskId: string
    updatedAt: number
    patch: Record<string, unknown>
  }>,
): Promise<boolean> {
  try {
    return (await updateTask({ taskId: input.taskId, expectedUpdatedAt: input.updatedAt, patch: input.patch })).ok
  } catch {
    return false
  }
}

export function membership(
  input: Readonly<{ current: ReadonlySet<string>; id: string; checked: boolean }>,
): Set<string> {
  const next = new Set(input.current)
  if (input.checked) next.add(input.id)
  else next.delete(input.id)
  return next
}

export function withoutPerson(current: ReadonlySet<string>, id: string): Set<string> {
  return new Set([...current].filter((personId) => personId !== id))
}

export function useAssignmentRoleHandlers(input: {
  setSaved: Dispatch<SetStateAction<boolean>>
  setResponsible: Dispatch<SetStateAction<string>>
  setCollaborators: Dispatch<SetStateAction<Set<string>>>
  setWatchers: Dispatch<SetStateAction<Set<string>>>
}) {
  function setResponsibleAndRemoveOverlap(id: string) {
    input.setSaved(false)
    input.setResponsible(id)
    input.setCollaborators((current) => withoutPerson(current, id))
    input.setWatchers((current) => withoutPerson(current, id))
  }
  function toggleRole(role: 'collaborator' | 'watcher', id: string, checked: boolean) {
    input.setSaved(false)
    const target = role === 'collaborator' ? input.setCollaborators : input.setWatchers
    const other = role === 'collaborator' ? input.setWatchers : input.setCollaborators
    target((current) => membership({ current, id, checked }))
    if (checked) other((current) => withoutPerson(current, id))
  }
  return {
    setResponsibleAndRemoveOverlap,
    toggleCollaborator: (id: string, checked: boolean) => {
      toggleRole('collaborator', id, checked)
    },
    toggleWatcher: (id: string, checked: boolean) => {
      toggleRole('watcher', id, checked)
    },
  }
}

export function assignmentIsDirty(input: {
  responsible: string
  primaryAssigneeId: string | null
  collaborators: ReadonlySet<string>
  collaboratorIds: readonly string[]
  watchers: ReadonlySet<string>
  watcherIds: readonly string[]
}) {
  const samePeople = (current: ReadonlySet<string>, expected: readonly string[]) =>
    current.size === expected.length && expected.every((id) => current.has(id))
  return (
    input.responsible !== (input.primaryAssigneeId ?? '') ||
    !samePeople(input.collaborators, input.collaboratorIds) ||
    !samePeople(input.watchers, input.watcherIds)
  )
}

export function taskAssignmentPatch(input: {
  responsible: string
  collaborators: ReadonlySet<string>
  watchers: ReadonlySet<string>
}) {
  return {
    primaryAssigneeId: input.responsible || null,
    collaboratorIds: [...input.collaborators].filter((id) => id !== input.responsible),
    watcherIds: [...input.watchers].filter((id) => id !== input.responsible && !input.collaborators.has(id)),
  }
}

export function saveTaskAssignment(input: {
  taskId: string
  updatedAt: number
  responsible: string
  collaborators: ReadonlySet<string>
  watchers: ReadonlySet<string>
}) {
  return saveTaskPatch({
    taskId: input.taskId,
    updatedAt: input.updatedAt,
    patch: taskAssignmentPatch(input),
  })
}

export async function saveAssignmentWithFeedback(input: {
  pending: boolean
  setPending: (value: boolean) => void
  setFailed: (value: boolean) => void
  setSaved: (value: boolean) => void
  onSuccess: () => void
  taskId: string
  updatedAt: number
  responsible: string
  collaborators: ReadonlySet<string>
  watchers: ReadonlySet<string>
}) {
  if (input.pending) return
  input.setPending(true)
  input.setFailed(false)
  const ok = await saveTaskAssignment(input)
  if (ok) {
    input.setSaved(true)
    input.onSuccess()
  } else input.setFailed(true)
  input.setPending(false)
}
