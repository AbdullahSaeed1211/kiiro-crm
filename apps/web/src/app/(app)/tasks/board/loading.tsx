'use client'

import { Skeleton } from '@ops/ui/components/ui/skeleton'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { TASK_COPY } from '../../../../i18n/config'
import { TaskCreateForm } from '../TaskCreateForm'
import { TaskWorkspaceViews } from '../TaskWorkspaceViews'
import { useLocale } from '../../../../i18n/locale-context'

const BOARD_COLUMNS = [0, 1, 2, 3]

function BoardColumnSkeleton({ index }: Readonly<{ index: number }>) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2">
      <Skeleton className="h-7" />
      {Array.from({ length: index === 0 ? 3 : 2 }, (_, card) => (
        <Skeleton key={card} className="h-20 rounded-md" />
      ))}
    </div>
  )
}

/** Keep board title, creation action, and workspace views available while task cards load. */
export default function TaskBoardLoading() {
  const locale = useLocale()
  const copy = TASK_COPY[locale]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.board }]} />
      <PageContent>
        <PageHeader
          title={copy.board}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Skeleton className="h-8 w-36" aria-hidden="true" />
              <TaskCreateForm />
              <TaskWorkspaceViews active="board" locale={locale} />
            </div>
          }
        />
        <div role="status" aria-label={copy.loadingBoard} aria-busy="true" className="flex gap-3 overflow-hidden">
          {BOARD_COLUMNS.map((index) => (
            <BoardColumnSkeleton key={index} index={index} />
          ))}
        </div>
      </PageContent>
    </>
  )
}
