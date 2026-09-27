import { playbooksSchema } from '@ops/module-work'
import type { Metadata } from 'next'
import { savePlaybooks } from '../../../../server/actions/settings/playbooks'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { PlaybookEditor } from './playbook-editor'

export const metadata: Metadata = { title: 'Playbooks' }
export const dynamic = 'force-dynamic'

export default async function PlaybooksSettingsPage() {
  await requireRole('owner', 'manager')
  const settings = await getWorkspaceSettings()
  const parsed = playbooksSchema.safeParse(settings.playbooks ?? [])
  return (
    <SettingsPage
      title="Playbooks"
      description="Standard task lists for onboarding a new client."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <p className="text-sm text-muted-foreground">
          When a deal is won, the playbook marked for won deals creates a project named after the deal, with these
          tasks. Due days count from the day the deal is won.
        </p>
        <PlaybookEditor initial={parsed.success ? parsed.data : []} action={savePlaybooks} />
      </SettingsForm>
    </SettingsPage>
  )
}
