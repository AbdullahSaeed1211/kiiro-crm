import type { Metadata } from 'next'
import { requireRole } from '../../../../server/auth/context'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'
import { crmDeps } from '../../../../server/container'
import { listCampaigns } from '../../../../server/newsletter/history'
import { AUDIENCES_FIELD_KEY, listSubscribers, NEWSLETTER_FIELD_KEY } from '../../../../server/newsletter/subscribers'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { NewsletterForms } from './newsletter-forms'

export const metadata: Metadata = { title: 'Newsletter' }
export const dynamic = 'force-dynamic'

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export default async function NewsletterSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const [fields, outboundEnabled, subscribers, campaigns] = await Promise.all([
    context.payload.find({
      collection: 'fieldDefinitions',
      where: { key: { in: [NEWSLETTER_FIELD_KEY, AUDIENCES_FIELD_KEY] } },
      limit: 10,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    }),
    getOutboundEmailEnabled(),
    crmDeps().then(listSubscribers),
    listCampaigns(context.payload),
  ])
  const audienceField = fields.docs.find((field) => field.key === AUDIENCES_FIELD_KEY)
  const audiences = stringList(audienceField?.options).map((name) => ({
    name,
    count: subscribers.filter((subscriber) => subscriber.audiences.includes(name)).length,
  }))
  return (
    <SettingsPage
      title="Newsletter"
      description="Send one message to every contact who opted in. Each email carries an unsubscribe link."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <NewsletterForms
          enabled={fields.docs.length === 3}
          outboundEnabled={outboundEnabled}
          subscribers={subscribers.map(({ id, email, name }) => ({ id, email, name }))}
          campaigns={campaigns}
          audiences={audiences}
        />
      </SettingsForm>
    </SettingsPage>
  )
}
