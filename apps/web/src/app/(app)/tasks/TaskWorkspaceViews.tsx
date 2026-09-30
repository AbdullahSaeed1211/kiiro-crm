import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import { TASK_COPY, type Locale } from '../../../i18n/config'

export type TaskWorkspaceView = 'table' | 'board' | 'calendar' | 'gantt'

const HREFS: Readonly<Record<TaskWorkspaceView, string>> = {
  table: '/tasks',
  board: '/tasks/board',
  calendar: '/calendar',
  gantt: '/timeline',
}

/** Compact navigation between the task workspace's supported representations. */
export function TaskWorkspaceViews({
  active,
  locale = 'en',
}: Readonly<{ active: TaskWorkspaceView; locale?: Locale }>) {
  const copy = TASK_COPY[locale]
  const views = (['table', 'board', 'calendar', 'gantt'] as const).map((id) => ({
    id,
    label: copy[id],
    href: HREFS[id],
  }))
  return <ViewSwitcher label={copy.views} views={views} active={active} />
}
