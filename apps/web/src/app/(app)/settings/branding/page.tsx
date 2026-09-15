import type { Metadata } from 'next'
import { saveBranding } from '../../../../server/actions/settings'
import { requireRole } from '../../../../server/auth/context'
import { BrandingSettingsForm } from './branding-settings-form'
import { SettingsActionForm } from '../settings-action-form'
import { SettingsForm, SettingsPage } from '../settings-shell'

export const metadata: Metadata = { title: 'Branding' }
export const dynamic = 'force-dynamic'

export default async function BrandingSettingsPage() {
  const context = await requireRole('owner')
  const settings = (await context.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    req: context.req,
  })) as unknown as Record<string, unknown>
  const brand =
    typeof settings.brand === 'object' && settings.brand !== null ? (settings.brand as Record<string, unknown>) : {}
  return (
    <SettingsPage title="Branding" description="Give your workspace a recognizable look." roles={['owner']}>
      <SettingsForm>
        <SettingsActionForm
          action={saveBranding}
          fields={[
            { name: 'primaryHex', label: 'Primary color' },
            {
              name: 'radius',
              label: 'Corner radius',
              type: 'select',
              options: [
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ],
            },
          ]}
          initialValues={{
            primaryHex: typeof brand.primaryHex === 'string' ? brand.primaryHex : '',
            radius: typeof brand.radius === 'string' ? brand.radius : 'md',
          }}
          submitLabel="Save branding"
        />
        <BrandingSettingsForm
          logoKey={typeof settings.logoFileKey === 'string' ? settings.logoFileKey : null}
          faviconKey={typeof settings.faviconFileKey === 'string' ? settings.faviconFileKey : null}
        />
      </SettingsForm>
    </SettingsPage>
  )
}
