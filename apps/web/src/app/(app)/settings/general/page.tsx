import type { Metadata } from 'next'
import { requireRole } from '../../../../server/auth/context'
import { updateSettings } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { LOCALE_LABELS } from '../../../../i18n/config'

export const metadata: Metadata = { title: 'General' }
export const dynamic = 'force-dynamic'

export default async function GeneralSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const settings = (await context.payload.findGlobal({ slug: 'settings', depth: 0 })) as unknown as Record<
    string,
    unknown
  >
  const editable = context.actor.role === 'owner'
  const values = Object.fromEntries(
    ['appName', 'timezone', 'locale', 'currency', 'weekStartsOn', 'stalledDays'].map((key) => [
      key,
      typeof settings[key] === 'string' || typeof settings[key] === 'number' ? settings[key] : '',
    ]),
  )
  return (
    <SettingsPage
      title="General"
      description="Workspace defaults and regional preferences."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        {editable ? (
          <SettingsActionForm
            action={updateSettings}
            fields={[
              { name: 'appName', label: 'Workspace name' },
              { name: 'timezone', label: 'Time zone' },
              {
                name: 'locale',
                label: 'Locale',
                type: 'select',
                options: [
                  { value: 'en', label: LOCALE_LABELS.en },
                  { value: 'es', label: LOCALE_LABELS.es },
                ],
              },
              { name: 'currency', label: 'Currency' },
              { name: 'weekStartsOn', label: 'Week starts on', type: 'number' },
              { name: 'stalledDays', label: 'Stalled after (days)', type: 'number' },
            ]}
            initialValues={values}
            submitLabel="Save changes"
          />
        ) : (
          <dl className="space-y-3 text-sm">
            {Object.entries(values).map(([key, value]) => (
              <div className="flex justify-between gap-4 border-b pb-2" key={key}>
                <dt className="text-muted-foreground">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </SettingsForm>
    </SettingsPage>
  )
}
