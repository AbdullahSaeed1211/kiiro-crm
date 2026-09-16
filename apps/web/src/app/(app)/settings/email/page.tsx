import type { Metadata } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { saveEmailSettings } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Email' }
export const dynamic = 'force-dynamic'

const value = (input: unknown): string => (typeof input === 'string' ? input : '')
const record = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}

export default async function EmailSettingsPage() {
  await requireRole('owner')
  const { env } = await getCloudflareContext({ async: true })
  const settings = await getWorkspaceSettings()
  const email = record(settings.email)
  return (
    <SettingsPage
      title="Email"
      description="Outbound sender identity is deployed with the Worker; inbound record-addressing can be changed here."
      roles={['owner']}
    >
      <SettingsForm>
        <div>
          <h2 className="font-medium">Outbound sender</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These values come from the deployed Worker configuration and are used by outbound email and delivery probes.
          </p>
        </div>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="font-medium">From name</dt>
            <dd className="text-muted-foreground">{value(email.fromName) || env.MAIL_FROM_NAME || 'Not configured'}</dd>
          </div>
          <div>
            <dt className="font-medium">From address</dt>
            <dd className="text-muted-foreground">
              {value(email.fromAddress) || env.MAIL_FROM_ADDRESS || 'Not configured'}
            </dd>
          </div>
        </dl>
      </SettingsForm>
      <SettingsForm>
        <div>
          <h2 className="font-medium">Inbound addressing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These values are stored in workspace settings and used when composing inbound record addresses.
          </p>
        </div>
        <SettingsActionForm
          action={saveEmailSettings}
          fields={[
            { name: 'inboundDomain', label: 'Inbound domain' },
            { name: 'inboundLocalPrefix', label: 'Inbound local prefix' },
          ]}
          initialValues={{
            inboundDomain: value(email.inboundDomain),
            inboundLocalPrefix: value(email.inboundLocalPrefix),
          }}
          submitLabel="Save email settings"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
