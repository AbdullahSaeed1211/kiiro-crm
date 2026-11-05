import type { Metadata } from 'next'
import { normalizeLocale, SHELL_COPY } from '../../../../i18n/config'
import { LEGACY_TERMINOLOGY_KEYS, TERMINOLOGY_KEYS, type TerminologyKey } from '../../../../i18n/terminology-keys'
import { saveTerminology } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'

export const metadata: Metadata = { title: 'Terminology' }
export const dynamic = 'force-dynamic'

/** The saved name for a term, or what an earlier form saved under its singular key. */
function termOf(terminology: Record<string, unknown>, key: TerminologyKey): string {
  const current = terminology[key]
  if (typeof current === 'string') return current
  const legacy = terminology[LEGACY_TERMINOLOGY_KEYS[key]]
  return typeof legacy === 'string' ? legacy : ''
}

export default async function TerminologySettingsPage() {
  await requireRole('owner', 'manager')
  const settings = await getWorkspaceSettings()
  const defaults = SHELL_COPY[normalizeLocale(settings.locale)]
  const terminology =
    typeof settings.terminology === 'object' && settings.terminology !== null
      ? (settings.terminology as Record<string, unknown>)
      : {}
  return (
    <SettingsPage
      title="Terminology"
      description="Use language that matches how your team works."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <SettingsActionForm
          action={saveTerminology}
          fields={TERMINOLOGY_KEYS.map((key) => ({ name: key, label: defaults[key] ?? key }))}
          initialValues={Object.fromEntries(TERMINOLOGY_KEYS.map((key) => [key, termOf(terminology, key)]))}
          submitLabel="Save terminology"
        />
      </SettingsForm>
    </SettingsPage>
  )
}
