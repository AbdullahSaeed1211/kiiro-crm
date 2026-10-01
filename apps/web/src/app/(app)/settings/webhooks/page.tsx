import { webhooksSchema } from '@ops/module-crm'
import type { Metadata } from 'next'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { getProductContext } from '../../../../server/auth/context'
import { payloadData } from '../../../../server/auth/api'
import { DeliveryLog, type DeliveryRow } from './delivery-log'
import { WebhooksForm } from './webhooks-form'

export const metadata: Metadata = { title: 'Webhooks' }
export const dynamic = 'force-dynamic'

const SHOWN = 25

const text = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback)
const count = (value: unknown, fallback: number | null): number | null => (typeof value === 'number' ? value : fallback)

function toRow(doc: Record<string, unknown> & { readonly id: string | number }): DeliveryRow {
  return {
    id: String(doc.id),
    at: count(doc.at, 0) ?? 0,
    name: text(doc.webhookName, 'Webhook'),
    event: text(doc.event, ''),
    ok: doc.ok === true,
    status: count(doc.status, null),
    attempts: count(doc.attempts, 1) ?? 1,
    error: text(doc.error, ''),
  }
}

/** The latest deliveries, newest first. */
async function recentDeliveries(): Promise<DeliveryRow[]> {
  const { payload } = await getProductContext()
  const found = await payloadData(payload).find({
    collection: 'webhookDeliveries',
    sort: '-at',
    limit: SHOWN,
    depth: 0,
    overrideAccess: true,
  })
  return found.docs.flatMap((doc) => (doc === undefined ? [] : [toRow(doc)]))
}

export default async function WebhooksSettingsPage() {
  const [settings, deliveries] = await Promise.all([getWorkspaceSettings(), recentDeliveries()])
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
      <SettingsForm>
        <DeliveryLog rows={deliveries} />
      </SettingsForm>
    </SettingsPage>
  )
}
