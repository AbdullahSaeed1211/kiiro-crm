import { leadRulesSchema } from '@ops/module-crm'
import { emailTemplatesSchema } from '@ops/module-mail'
import type { Metadata } from 'next'
import { getProductContext, getWorkspaceSettings } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { EmailTemplatesForm } from './email-templates-form'
import { LeadRulesForm } from './lead-rules-form'
import { ResponseTargetForm } from './response-target-form'

export const metadata: Metadata = { title: 'Sales' }
export const dynamic = 'force-dynamic'

async function activePeople() {
  const { payload, req } = await getProductContext()
  const found = await payload.find({
    collection: 'users',
    where: { active: { equals: true } },
    sort: 'name',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return found.docs.map((user) => ({ id: user.id, name: user.name }))
}

async function leadSources() {
  const { payload, req } = await getProductContext()
  const found = await payload.find({
    collection: 'sources',
    sort: 'name',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return found.docs.map((source) => ({ id: source.id, name: source.name }))
}

export default async function SalesSettingsPage() {
  const [settings, people, sources] = await Promise.all([getWorkspaceSettings(), activePeople(), leadSources()])
  const templates = emailTemplatesSchema.safeParse(settings.emailTemplates ?? [])
  const rules = leadRulesSchema.safeParse(settings.automations ?? [])
  const hours = typeof settings.responseTargetHours === 'number' ? settings.responseTargetHours : 0
  return (
    <SettingsPage
      title="Sales"
      description="How new leads are assigned, how fast they should be answered, and the emails you send most."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <ResponseTargetForm hours={hours} />
      </SettingsForm>
      <SettingsForm>
        <LeadRulesForm initial={rules.success ? rules.data : []} sources={sources} people={people} />
      </SettingsForm>
      <SettingsForm>
        <EmailTemplatesForm initial={templates.success ? templates.data : []} />
      </SettingsForm>
    </SettingsPage>
  )
}
