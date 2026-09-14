import type { Metadata } from 'next'
import { SettingsForm, SettingRow, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Branding · Workspace' }
export const dynamic = 'force-dynamic'

export default function BrandingSettingsPage() {
  return (
    <SettingsPage title="Branding" description="Give your workspace a recognizable look." roles={['owner']}>
      <SettingsForm>
        <SettingRow label="Primary color" value="#2563EB" />
        <SettingRow label="Corner radius" value="md" />
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Logo and favicon uploads support PNG, SVG, or WebP up to 1 MB.
        </div>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="button">
          Save branding
        </button>
      </SettingsForm>
    </SettingsPage>
  )
}
