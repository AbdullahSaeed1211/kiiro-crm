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
