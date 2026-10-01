import { webhooksSchema } from '@ops/module-crm'
import type { Metadata } from 'next'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { WebhooksForm } from './webhooks-form'

export const metadata: Metadata = { title: 'Webhooks' }
export const dynamic = 'force-dynamic'

export default async function WebhooksSettingsPage() {
  const settings = await getWorkspaceSettings()
  const saved = webhooksSchema.safeParse(settings.webhooks ?? [])
  return (
    <SettingsPage
      title="Webhooks"
      description="Send an event to another system, such as Zapier, Make or your own software, whenever something happens to a record."
      roles={['owner']}
    >
      <SettingsForm>
        <WebhooksForm initial={saved.success ? saved.data : []} />
      </SettingsForm>
    </SettingsPage>
  )
}
