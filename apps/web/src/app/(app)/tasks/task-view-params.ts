import type { SavedViewSummary } from '../../../server/queries/settings/listSavedViews'
import { formatTaskSort } from '../../../server/queries/work/tasks/listTasks'
import type { TaskSort, TaskSortKey } from '../../../server/queries/work/tasks/types'

type TaskMode = 'all' | 'open' | 'mine'

const SORT_KEYS: readonly unknown[] = ['title', 'stage', 'priority', 'dueAt'] satisfies readonly TaskSortKey[]

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** The selected view: a saved view id, or one of the built-in modes. */
export function parseTaskView(value: string | undefined, savedViews: readonly SavedViewSummary[]): string {
  if (value !== undefined && savedViews.some((view) => view.id === value)) return value
  return value === 'open' || value === 'mine' ? value : 'all'
}

/** The sort a saved view stores, or `fallback` when it stores none. */
export function savedViewSort(view: SavedViewSummary | undefined, fallback: TaskSort): TaskSort {
  const stored = asRecord(view?.sort)
  const key = stored?.key
  return stored !== undefined && SORT_KEYS.includes(key)
    ? { key: key as TaskSortKey, desc: stored.desc === true }
    : fallback
}

function savedViewMode(view: SavedViewSummary): TaskMode {
  const status = asRecord(view.filter)?.status
  return status === 'open' || status === 'mine' ? status : 'all'
}

/** Which tasks the view lists: a saved view's status filter, or the built-in mode. */
export function taskModeOf(view: string, savedView: SavedViewSummary | undefined): TaskMode {
  if (savedView !== undefined) return savedViewMode(savedView)
  return view === 'open' || view === 'mine' ? view : 'all'
}

/** The tasks list address that shows this sort, page and view; a task opened from it returns here. */
export function taskListHref({ sort, page, view }: Readonly<{ sort: TaskSort; page: number; view: string }>): string {
  return `/tasks?${new URLSearchParams({ sort: formatTaskSort(sort), page: String(page), view }).toString()}`
}
