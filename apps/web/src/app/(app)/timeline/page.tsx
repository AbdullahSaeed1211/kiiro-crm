import { AppHeader } from '@ops/ui/composites/AppHeader'
import { AppShell } from '@ops/ui/composites/AppShell'
import { AppSidebar, type NavGroup, type NavItem } from '@ops/ui/composites/AppSidebar'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { CalendarDays, ChartGantt, CircleCheckBig, LayoutDashboard, ListTodo, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getWorkDeps } from '../../../server/work/deps'
import type { TaskRecord, WorkDeps } from '../../../server/work/task-repository'
import type { TimelineTask } from './save-dates'
import { TimelineChart } from './TimelineChart'

// Default product name until settings.appName exists (decision D-05).
const APP_NAME = 'Workspace'
const PAGE_TITLE = 'Timeline'
const PAGE_HREF = '/timeline'

/** Browser tab title, `{page} · {appName}` (spec §17). */
export const metadata: Metadata = { title: `${PAGE_TITLE} · ${APP_NAME}` }

/** Reads the task repository on every request. */
export const dynamic = 'force-dynamic'

function navItem([label, href, icon]: readonly [string, string, LucideIcon]): NavItem {
  return href === PAGE_HREF ? { label, href, icon, active: true } : { label, href, icon }
}

const NAV: readonly NavGroup[] = [
  {
    id: 'general',
    items: [navItem(['Dashboard', '/', LayoutDashboard]), navItem(['My tasks', '/my-tasks', CircleCheckBig])],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      navItem(['Tasks', '/tasks', ListTodo]),
      navItem(['Calendar', '/calendar', CalendarDays]),
      navItem([PAGE_TITLE, PAGE_HREF, ChartGantt]),
    ],
  },
]

function toTimelineTask({ id, title, startAt, dueAt, updatedAt }: TaskRecord): TimelineTask {
  return { id, title, startAt, dueAt, updatedAt }
}

async function datedTasks(deps: WorkDeps): Promise<TimelineTask[]> {
  const tasks = await deps.tasks.listTasks()
  return tasks
    .filter((task) => task.startAt !== null || task.dueAt !== null)
    .filter((task) => deps.can(deps.actor, 'read', { type: 'task', assigneeIds: task.assigneeIds }))
    .map(toTimelineTask)
}

/** Timeline (spec §17.9); renders the application shell itself until M1-L3 moves it into the layout. */
export default async function TimelinePage() {
  const tasks = await datedTasks(await getWorkDeps())
  // The vendored shadcn sidebar persists its open state in this cookie.
  const sidebarState = (await cookies()).get('sidebar_state')?.value
  return (
    <AppShell
      defaultOpen={sidebarState !== 'false'}
      sidebar={<AppSidebar appName={APP_NAME} groups={NAV} />}
      header={<AppHeader breadcrumbs={[{ label: PAGE_TITLE }]} />}
    >
      {tasks.length > 0 ? (
        <TimelineChart title={PAGE_TITLE} tasks={tasks} />
      ) : (
        <>
          <PageHeader title={PAGE_TITLE} />
          <EmptyState
            icon={ChartGantt}
            title="No dated tasks"
            description="Tasks with a start or due date show up here."
          />
        </>
      )}
    </AppShell>
  )
}
