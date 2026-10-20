import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import { TASK_COPY, type Locale } from '../../../i18n/config'

export type TaskWorkspaceView = 'mine' | 'table' | 'board' | 'calendar' | 'gantt' | 'repeating'

const HREFS: Readonly<Record<TaskWorkspaceView, string>> = {
  mine: '/my-tasks',
  table: '/tasks',
  board: '/tasks/board',
  calendar: '/calendar',
  gantt: '/timeline',
  repeating: '/tasks/repeating',
}

/** Compact navigation between the task workspace's supported representations. */
export function TaskWorkspaceViews({
  active,
  locale = 'en',
  mine = false,
}: Readonly<{ active: TaskWorkspaceView; locale?: Locale; mine?: boolean }>) {
  const copy = TASK_COPY[locale]
  const views = (['mine', 'table', 'board', 'calendar', 'gantt', 'repeating'] as const).map((id) => ({
    id,
    label: id === 'mine' ? copy.myTasks : copy[id],
    href: mine && id !== 'mine' ? `${HREFS[id]}?view=mine` : HREFS[id],
  }))
  return <ViewSwitcher label={copy.views} views={views} active={active} />
}
