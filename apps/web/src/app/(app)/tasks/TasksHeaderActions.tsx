import { Button } from '@ops/ui/components/ui/button'
import Link from 'next/link'
import { TASK_COPY } from '../../../i18n/config'
import type { Locale } from '../../../i18n/locale'
import type { SavedViewSummary } from '../../../server/queries/settings/listSavedViews'
import { TaskViewMenu } from './TaskViewMenu'
import { TaskWorkspaceViews } from './TaskWorkspaceViews'

interface TasksHeaderActionsProps {
  readonly view: string
  readonly locale: Locale
  readonly savedViews: readonly SavedViewSummary[]
  /** What a link from a record pre-fills in the quick-add form. */
  readonly initial: { readonly relatedType?: string; readonly relatedId?: string; readonly title?: string }
}

/** The new-task page address, carrying the record or title a link from elsewhere asked to start from. */
function newTaskHref(initial: TasksHeaderActionsProps['initial']): string {
  const params = new URLSearchParams()
  const entries: [string, string | undefined][] = Object.entries(initial)
  for (const [name, value] of entries) if (value !== undefined && value !== '') params.set(name, value)
  const query = params.toString()
  return query === '' ? '/tasks/new' : `/tasks/new?${query}`
}

/** The buttons beside the tasks title: New task, saved views and the view switcher (last, so it stays put between views). */
export function TasksHeaderActions({ view, locale, savedViews, initial }: TasksHeaderActionsProps) {
  const copy = TASK_COPY[locale]
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button nativeButton={false} size="lg" render={<Link href={newTaskHref(initial)}>{copy.newTask}</Link>}>
        {copy.newTask}
      </Button>
      <TaskViewMenu
        selectedId={view}
        locale={locale}
        customViews={savedViews.map((savedView) => ({
          id: savedView.id,
          label: savedView.name,
          pinned: savedView.pinned,
        }))}
      />
      <TaskWorkspaceViews active="table" locale={locale} mine={view === 'mine'} />
    </div>
  )
}
