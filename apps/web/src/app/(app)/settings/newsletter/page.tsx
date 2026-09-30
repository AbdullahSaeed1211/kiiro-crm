import type { Metadata } from 'next'
import { requireRole } from '../../../../server/auth/context'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'
import { crmDeps } from '../../../../server/container'
import { listCampaigns } from '../../../../server/newsletter/history'
import { listSubscribers, NEWSLETTER_FIELD_KEY } from '../../../../server/newsletter/subscribers'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { NewsletterForms } from './newsletter-forms'

export const metadata: Metadata = { title: 'Newsletter' }
export const dynamic = 'force-dynamic'

export default async function NewsletterSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const [fields, outboundEnabled, subscribers, campaigns] = await Promise.all([
    context.payload.find({
      collection: 'fieldDefinitions',
      where: { and: [{ recordType: { in: ['contact', 'lead'] } }, { key: { equals: NEWSLETTER_FIELD_KEY } }] },
      limit: 2,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    }),
    getOutboundEmailEnabled(),
    crmDeps().then(listSubscribers),
    listCampaigns(context.payload),
  ])
  return (
    <SettingsPage
      title="Newsletter"
      description="Send one message to every contact who opted in. Each email carries an unsubscribe link."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <NewsletterForms
          enabled={fields.docs.length === 2}
          outboundEnabled={outboundEnabled}
          subscribers={subscribers.map(({ id, email, name }) => ({ id, email, name }))}
          campaigns={campaigns}
        />
      </SettingsForm>
    </SettingsPage>
  )
}
