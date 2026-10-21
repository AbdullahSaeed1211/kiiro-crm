import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { listAttendance } from '@ops/module-work'
import { isManagerUp } from '@ops/platform'
import { getRequestContext } from '@/server/container'
import { attendanceDeps } from '@/server/attendance'
import { getWorkspaceSettings } from '@/server/auth/context'
import { normalizeLocale } from '@/i18n/locale'
import { ATTENDANCE_COPY } from '@/i18n/attendance-copy'
import { AttendanceWorkspace } from './workspace'

export const dynamic = 'force-dynamic'

export default async function AttendancePage({ searchParams }: Readonly<{ searchParams: Promise<{ view?: string }> }>) {
  const context = await getRequestContext()
  const params = await searchParams
  const team = params.view === 'team' && isManagerUp(context.actor)
  const deps = attendanceDeps(context)
  const [result, open, settings, people] = await Promise.all([
    listAttendance(deps, team),
    deps.repo.open(context.actor.id),
    getWorkspaceSettings(),
    context.payload.find({
      collection: 'users',
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: false,
      req: context.req,
    }),
  ])
  const locale = normalizeLocale(settings.locale)
  const names = Object.fromEntries(people.docs.map((person) => [person.id, person.name || person.email]))
  return (
    <>
      <AppHeader breadcrumbs={[{ label: ATTENDANCE_COPY[locale].title }]} />
      <PageContent>
        <AttendanceWorkspace
          key={team ? 'team' : 'mine'}
          records={result.ok ? result.value : []}
          open={open ?? null}
          names={names}
          team={team}
          admin={isManagerUp(context.actor)}
        />
      </PageContent>
    </>
  )
}
