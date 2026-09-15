import type { Metadata } from 'next'
import { saveTerminology } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { requireRole } from '../../../../server/auth/context'

export const metadata: Metadata = { title: 'Terminology' }
export const dynamic = 'force-dynamic'

export default async function TerminologySettingsPage() {
  const context = await requireRole('owner', 'manager')
  const settings = await context.payload.findGlobal({ slug: 'settings', depth: 0, req: context.req })
  const terminology =
    typeof settings.terminology === 'object' && settings.terminology !== null
      ? (settings.terminology as Record<string, unknown>)
      : {}
  return (
    <SettingsPage
      title="Terminology"
      description="Use language that matches how your team works."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <SettingsActionForm
          action={saveTerminology}
          fields={[
            { name: 'organization', label: 'Organization' },
            { name: 'contact', label: 'Contact' },
            { name: 'lead', label: 'Lead' },
            { name: 'deal', label: 'Deal' },
            { name: 'project', label: 'Project' },
            { name: 'task', label: 'Task' },
          ]}
          initialValues={Object.fromEntries(
            ['organization', 'contact', 'lead', 'deal', 'project', 'task'].map((key) => [
              key,
              typeof terminology[key] === 'string' ? terminology[key] : '',
            ]),
          )}
          submitLabel="Save terminology"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
