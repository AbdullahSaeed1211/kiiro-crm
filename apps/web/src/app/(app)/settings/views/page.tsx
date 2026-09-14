import type { Metadata } from 'next'
import { saveConfiguration } from '../../../../server/actions/settings'
import { listSavedViews } from '../../../../server/queries/settings/listSavedViews'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { SavedViewList } from './saved-view-list'

export const metadata: Metadata = { title: 'Views' }
export const dynamic = 'force-dynamic'

const RECORD_TYPES = ['organization', 'contact', 'lead', 'deal', 'project', 'task'] as const

export default async function ViewsSettingsPage() {
  const savedViews = (await Promise.all(RECORD_TYPES.map((recordType) => listSavedViews(recordType)))).flat()
  return (
    <SettingsPage
      title="Views"
      description="Save shared list, board, calendar, and timeline configurations."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <p className="text-sm text-muted-foreground">
          Shared views are available to everyone in this workspace. Personal views can be added from the relevant list
          when that surface supports them.
        </p>
        <SettingsActionForm
          action={saveConfiguration}
          fixedValues={{
            collection: 'savedViews',
            owner: null,
            filter: null,
            sort: { key: 'dueAt', desc: false },
            columns: ['title', 'stage', 'priority', 'assignees', 'dueAt', 'context'],
            pinned: false,
            isDefault: false,
          }}
          fields={[
            {
              name: 'recordType',
              label: 'Record type',
              type: 'select',
              options: [
                ['organization', 'Organizations'],
                ['contact', 'Contacts'],
                ['lead', 'Leads'],
                ['deal', 'Deals'],
                ['project', 'Projects'],
                ['task', 'Tasks'],
              ].map(([value, label]) => ({ value, label })),
            },
            { name: 'name', label: 'View name' },
            {
              name: 'kind',
              label: 'View kind',
              type: 'select',
              options: [
                { value: 'table', label: 'Table' },
                { value: 'board', label: 'Board' },
                { value: 'calendar', label: 'Calendar' },
                { value: 'timeline', label: 'Timeline' },
              ],
            },
          ]}
          initialValues={{ recordType: 'task', kind: 'table' }}
          submitLabel="Save view"
        />
        <div className="space-y-3 border-t pt-5">
          <div>
            <h2 className="text-sm font-semibold">Saved views</h2>
            <p className="text-sm text-muted-foreground">Shared and personal views available in each record list.</p>
          </div>
          <SavedViewList views={savedViews} />
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
