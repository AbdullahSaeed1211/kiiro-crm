import { CalendarMonth, type CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { loadWorkReadModel } from '../../../server/queries/work/read-models'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Calendar · Workspace' }

function dateInZone(value: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}
function eventTone(priority: string): CalendarEvent['tone'] {
  if (priority === 'urgent') return 'red'
  if (priority === 'high') return 'amber'
  return 'blue'
}

/** Month calendar for scoped tasks, grouped by due date. */
export default async function CalendarPage() {
  const model = await loadWorkReadModel()
  const now = new Date()
  const events: CalendarEvent[] = model.tasks
    .filter((task): task is typeof task & { readonly dueAt: number } => task.dueAt !== null)
    .map((task) => ({
      id: task.id,
      title: task.title,
      date: dateInZone(task.dueAt, model.timeZone),
      href: `/tasks/${task.id}`,
      tone: eventTone(task.priority),
    }))
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Calendar' }]} />
      <PageContent>
        <PageHeader title="Calendar" description="Tasks by due date." />
        <CalendarMonth year={now.getUTCFullYear()} month={now.getUTCMonth()} events={events} />
      </PageContent>
    </>
  )
}
