import type { Metadata } from 'next'
import { saveBranding } from '../../../../server/actions/settings'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Branding · Workspace' }
export const dynamic = 'force-dynamic'

export default function BrandingSettingsPage() {
  return (
    <SettingsPage title="Branding" description="Give your workspace a recognizable look." roles={['owner']}>
      <SettingsForm>
        <SettingsActionForm
          action={saveBranding}
          fields={[
            { name: 'primaryHex', label: 'Primary color' },
            { name: 'radius', label: 'Corner radius' },
          ]}
          submitLabel="Save branding"
        />
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Logo and favicon uploads support PNG, SVG, or WebP up to 1 MB.
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
