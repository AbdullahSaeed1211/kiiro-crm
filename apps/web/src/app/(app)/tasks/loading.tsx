'use client'

import { Skeleton } from '@ops/ui/components/ui/skeleton'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { SHELL_COPY, TASK_COPY } from '../../../i18n/config'
import { catalogFor } from '../../../i18n/locale'
import { SECTION_HELP_COPY } from '../../../i18n/section-help-copy'
import { useLocale } from '../../../i18n/locale-context'
import { TasksHeaderActions } from './TasksHeaderActions'

function TaskRowsSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="overflow-hidden rounded-lg border">
      {Array.from({ length: 8 }, (_, row) => (
        <div key={row} className="flex h-10 items-center gap-4 border-b px-2 last:border-b-0">
          {Array.from({ length: 7 }, (_, column) => (
            <Skeleton key={column} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Keep the stable task header and view controls interactive; only the record rows are placeholders. */
export default function TasksLoading() {
  const locale = useLocale()
  const copy = TASK_COPY[locale]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: SHELL_COPY[locale].tasks }]} />
      <PageContent>
        <PageHeader
          title={copy.openTasks}
          description={catalogFor(SECTION_HELP_COPY, locale).tasks}
          actions={<TasksHeaderActions view="open" locale={locale} savedViews={[]} initial={{}} />}
        />
        <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-36" />
        </div>
        <TaskRowsSkeleton label={copy.loadingTasks} />
      </PageContent>
    </>
  )
}
