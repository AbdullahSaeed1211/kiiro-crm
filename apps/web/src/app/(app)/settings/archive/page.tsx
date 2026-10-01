import type { Metadata } from 'next'
import { getProductContext } from '../../../../server/auth/context'
import { loadArchived } from '../../../../server/crm/archived'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { RestoreButton } from './restore-button'

export const metadata: Metadata = { title: 'Archive' }
export const dynamic = 'force-dynamic'

const NAMES = {
  lead: 'Lead',
  deal: 'Deal',
  contact: 'Contact',
  organization: 'Organization',
  task: 'Task',
  project: 'Project',
} as const

const archivedOn = (time: number): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

/** Records that were archived, with a way to bring each one back. */
export default async function ArchiveSettingsPage() {
  const archived = await loadArchived(await getProductContext())
  return (
    <SettingsPage
      title="Archive"
      description="Leads, deals, contacts, organizations, projects and tasks that were archived. Restore one to put it back in its lists."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        {archived.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is archived.</p>
        ) : (
          <ul className="divide-y text-sm">
            {archived.map((record) => (
              <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{record.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {NAMES[record.type]} · archived {archivedOn(record.archivedAt)}
                  </span>
                </span>
                <RestoreButton type={record.type} id={record.id} updatedAt={record.updatedAt} />
              </li>
            ))}
          </ul>
        )}
      </SettingsForm>
    </SettingsPage>
  )
}
