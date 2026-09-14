import type { Metadata } from 'next'
import { saveConfiguration } from '../../../../server/actions/settings'
import { listSavedViews } from '../../../../server/queries/settings/listSavedViews'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Views' }
export const dynamic = 'force-dynamic'

export default async function ViewsSettingsPage() {
  const taskViews = await listSavedViews('task')
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
            { name: 'recordType', label: 'Record type' },
            { name: 'name', label: 'View name' },
            { name: 'kind', label: 'View kind' },
          ]}
          initialValues={{ recordType: 'task', kind: 'table' }}
          submitLabel="Save view"
        />
        <div className="space-y-3 border-t pt-5">
          <div>
            <h2 className="text-sm font-semibold">Task views</h2>
            <p className="text-sm text-muted-foreground">Shared and personal views available in the Tasks menu.</p>
          </div>
          {taskViews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved task views yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border" aria-label="Saved task views">
              {taskViews.map((view) => (
                <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm" key={view.id}>
                  <span className="min-w-0 truncate font-medium">{view.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {view.ownerId === null ? 'Shared' : 'Personal'} · {view.kind}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
