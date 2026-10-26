import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { listContentItems } from '@ops/module-work'
import { getRequestContext, workCommandDeps } from '@/server/container'
import { catalogFor } from '../../../i18n/locale'
import { AGENCY_WORK_COPY } from '../../../i18n/agency-work-copy'
import { loadWorkReadModel } from '../../../server/queries/work/read-models'
import { ContentCalendarView } from './content-calendar-view'
import { LoadFailure } from '../load-failure'

export const dynamic = 'force-dynamic'

function calendarPeriod(input: { readonly month?: string; readonly year?: string; readonly now: Date }) {
  const { month: monthValue, year: yearValue, now } = input
  const month = Number(monthValue)
  const year = Number(yearValue)
  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1,
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : now.getFullYear(),
  }
}

function selectedProject(projects: readonly { readonly id: string }[], requestedId: string | undefined): string {
  return projects.some((project) => project.id === requestedId) ? (requestedId ?? '') : ''
}

export default async function ContentCalendarPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ month?: string; year?: string; projectId?: string; contentItemId?: string }> }>) {
  const params = await searchParams
  const [model, context] = await Promise.all([loadWorkReadModel(), getRequestContext()])
  const now = new Date()
  const period = calendarPeriod({ month: params.month, year: params.year, now })
  const selectedMonth = period.month
  const selectedYear = period.year
  const selectedProjectId = selectedProject(model.projects, params.projectId)
  const from = Date.UTC(selectedYear, selectedMonth - 1, 1)
  const to = Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
  const result = await listContentItems(await workCommandDeps(context), {
    from,
    to,
    ...(selectedProjectId === '' ? {} : { projectId: selectedProjectId }),
  })
  const names = new Map(model.projects.map((project) => [project.id, project.name]))
  const items = result.ok ? result.value.map((item) => ({ ...item, projectName: names.get(item.projectId) ?? '' })) : []
  const copy = catalogFor(AGENCY_WORK_COPY, model.locale)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.contentTitle }]} />
      <PageContent>
        <div className="grid gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{copy.contentTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{copy.contentDescription}</p>
          </div>
          {result.ok ? (
            <ContentCalendarView
              key={`${String(selectedYear)}-${String(selectedMonth)}-${selectedProjectId}`}
              initialItems={items}
              projects={model.projects.map(({ id, name }) => ({ id, name }))}
              selectedProjectId={selectedProjectId}
              selectedContentItemId={params.contentItemId ?? ''}
              timeZone={model.timeZone}
              year={selectedYear}
              month={selectedMonth}
              weekStartsOn={model.weekStartsOn}
            />
          ) : (
            <LoadFailure title={copy.contentTitle} />
          )}
        </div>
      </PageContent>
    </>
  )
}
