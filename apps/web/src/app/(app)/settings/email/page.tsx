import type { Metadata } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { saveEmailSettings } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { Badge } from '@ops/ui/components/ui/badge'
import { MailCheck, MailWarning } from 'lucide-react'
import { normalizeLocale } from '../../../../i18n/config'
import { EMAIL_SETTINGS_COPY } from '../../../../i18n/email-settings-copy'

export const metadata: Metadata = { title: 'Email' }
export const dynamic = 'force-dynamic'

const value = (input: unknown): string => (typeof input === 'string' ? input : '')
const record = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}

// eslint-disable-next-line complexity -- settings has separate tenant-configured outbound and editable inbound sections.
export default async function EmailSettingsPage() {
  await requireRole('owner')
  const { env } = await getCloudflareContext({ async: true })
  const settings = await getWorkspaceSettings()
  const email = record(settings.email)
  const copy = EMAIL_SETTINGS_COPY[normalizeLocale(settings.locale)]
  const outboundEmailEnabled = env.MAIL_TRANSPORT === 'cloudflare' || env.MAIL_TRANSPORT === 'console'
  return (
    <SettingsPage
      title="Email"
      description="Outbound sender identity is deployed with the Worker; inbound record-addressing can be changed here."
      roles={['owner']}
    >
      <SettingsForm>
        <div className={outboundEmailEnabled ? undefined : 'opacity-60'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{copy.outbound}</h2>
            <Badge variant={outboundEmailEnabled ? 'secondary' : 'outline'}>
              {outboundEmailEnabled ? <MailCheck aria-hidden /> : <MailWarning aria-hidden />}
              {outboundEmailEnabled ? copy.available : copy.unavailable}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.fromDeployment}</p>
        </div>
        {outboundEmailEnabled ? null : (
          <div
            className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground"
            role="status"
          >
            <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>{copy.notEnabled}</p>
          </div>
        )}
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="font-medium">{copy.fromName}</dt>
            <dd className="text-muted-foreground">
              {value(email.fromName) || env.MAIL_FROM_NAME || copy.notConfigured}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{copy.fromAddress}</dt>
            <dd className="text-muted-foreground">
              {value(email.fromAddress) || env.MAIL_FROM_ADDRESS || copy.notConfigured}
            </dd>
          </div>
        </dl>
      </SettingsForm>
      <SettingsForm>
        <div>
          <h2 className="font-medium">{copy.inbound}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.inboundHelp}</p>
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
