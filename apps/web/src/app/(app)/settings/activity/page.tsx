import type { Metadata } from 'next'
import Link from 'next/link'
import { getProductContext } from '../../../../server/auth/context'
import { loadRecentActivity } from '../../../../server/crm/recent-activity'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Activity' }
export const dynamic = 'force-dynamic'

const ROUTES: ReadonlyMap<string, string> = new Map([
  ['lead', '/leads'],
  ['deal', '/deals'],
  ['contact', '/contacts'],
  ['organization', '/organizations'],
  ['project', '/projects'],
  ['task', '/tasks'],
])

const when = (time: number): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(time) + ' UTC'

/** Who changed what, across every record, for the last hundred changes. */
export default async function ActivitySettingsPage() {
  const rows = await loadRecentActivity(await getProductContext())
  return (
    <SettingsPage
      title="Activity"
      description="The latest changes anyone made to leads, deals, contacts, organizations, projects and tasks."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has changed yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{row.actor}</span> · {row.what}
                  <span className="block text-xs text-muted-foreground">{when(row.occurredAt)}</span>
                </span>
                {ROUTES.has(row.recordType) ? (
                  <Link className="text-xs underline" href={`${ROUTES.get(row.recordType) ?? ''}/${row.recordId}`}>
                    Open {row.recordType}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SettingsForm>
    </SettingsPage>
  )
}
