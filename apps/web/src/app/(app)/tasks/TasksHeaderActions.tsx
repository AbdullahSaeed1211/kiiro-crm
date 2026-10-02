import { Button } from '@ops/ui/components/ui/button'
import Link from 'next/link'
import { TASK_COPY } from '../../../i18n/config'
import type { Locale } from '../../../i18n/locale'
import type { SavedViewSummary } from '../../../server/queries/settings/listSavedViews'
import { TaskCreateForm } from './TaskCreateForm'
import { TaskViewMenu } from './TaskViewMenu'
import { TaskWorkspaceViews } from './TaskWorkspaceViews'

interface TasksHeaderActionsProps {
  readonly view: string
  readonly locale: Locale
  readonly savedViews: readonly SavedViewSummary[]
  /** What a link from a record pre-fills in the quick-add form. */
  readonly initial: { readonly relatedType?: string; readonly relatedId?: string; readonly title?: string }
}

/** The buttons beside the tasks title: view switcher, New task, saved views and quick add. */
export function TasksHeaderActions({ view, locale, savedViews, initial }: TasksHeaderActionsProps) {
  const copy = TASK_COPY[locale]
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <TaskWorkspaceViews active="table" locale={locale} />
      <Button nativeButton={false} size="lg" render={<Link href="/tasks/new">{copy.newTask}</Link>}>
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
      <TaskCreateForm relatedType={initial.relatedType} relatedId={initial.relatedId} initialTitle={initial.title} />
    </div>
  )
}
