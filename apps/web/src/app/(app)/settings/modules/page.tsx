import type { Metadata } from 'next'
import { saveModules } from '../../../../server/actions/settings'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { normalizeLocale } from '../../../../i18n/config'
import { MODULES_COPY } from '../../../../i18n/modules-copy'
import { ModuleSettingsForm } from './module-settings-form'

export const metadata: Metadata = { title: 'Modules' }
export const dynamic = 'force-dynamic'

export default async function ModulesSettingsPage() {
  await requireRole('owner')
  const settings = await getWorkspaceSettings()
  const modules = settings.modules as Record<string, unknown>
  return (
    <SettingsPage title="Modules" description="Choose which workspace capabilities are available." roles={['owner']}>
      <SettingsForm>
        <p className="text-sm text-muted-foreground">{MODULES_COPY[normalizeLocale(settings.locale)].intro}</p>
        <ModuleSettingsForm
          action={saveModules}
          initialValues={{
            crm: modules.crm !== false,
            work: modules.work !== false,
            intake: modules.intake !== false,
            mail: modules.mail !== false,
          }}
        />
      </SettingsForm>
    </SettingsPage>
  )
}
