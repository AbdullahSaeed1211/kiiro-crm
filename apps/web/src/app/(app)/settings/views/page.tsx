import type { Metadata } from 'next'
import { saveConfiguration } from '../../../../server/actions/settings/configuration'
import { listSavedViews } from '../../../../server/queries/settings/listSavedViews'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { catalogFor } from '../../../../i18n/locale'
import { VIEWS_COPY } from '../../../../i18n/views-copy'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { SavedViewList } from './saved-view-list'

export const metadata: Metadata = { title: 'Views' }
export const dynamic = 'force-dynamic'

const RECORD_TYPES = ['organization', 'contact', 'lead', 'deal', 'project', 'task'] as const

export default async function ViewsSettingsPage() {
  const [savedViews, settings] = await Promise.all([
    Promise.all(RECORD_TYPES.map((recordType) => listSavedViews(recordType))).then((lists) => lists.flat()),
    getWorkspaceSettings(),
  ])
  const copy = catalogFor(VIEWS_COPY, settings.locale)
  return (
    <SettingsPage
      title="Views"
      description="Save shared list, board, calendar, and timeline configurations."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <p className="text-sm text-muted-foreground">{copy.intro}</p>
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
            <h2 className="text-sm font-semibold">{copy.listTitle}</h2>
            <p className="text-sm text-muted-foreground">{copy.listIntro}</p>
          </div>
          <SavedViewList views={savedViews} />
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
