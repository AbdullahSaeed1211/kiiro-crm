import { playbooksSchema } from '@ops/module-work'
import type { Metadata } from 'next'
import { savePlaybooks } from '../../../../server/actions/settings/playbooks'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { PlaybookEditor } from './playbook-editor'
import { catalogFor } from '../../../../i18n/locale'
import { PLAYBOOKS_COPY } from '../../../../i18n/playbooks-copy'

export const metadata: Metadata = { title: 'Playbooks' }
export const dynamic = 'force-dynamic'

export default async function PlaybooksSettingsPage() {
  await requireRole('owner', 'manager')
  const settings = await getWorkspaceSettings()
  const copy = catalogFor(PLAYBOOKS_COPY, settings.locale)
  const parsed = playbooksSchema.safeParse(settings.playbooks ?? [])
  return (
    <SettingsPage
      title="Playbooks"
      description="Standard task lists for onboarding a new client."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <p className="text-sm text-muted-foreground">{copy.intro}</p>
        <PlaybookEditor initial={parsed.success ? parsed.data : []} action={savePlaybooks} />
      </SettingsForm>
    </SettingsPage>
  )
}
