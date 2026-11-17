import type { Metadata } from 'next'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { CallingSettings } from './calling-settings'

export const metadata: Metadata = { title: 'Calling' }
export const dynamic = 'force-dynamic'

export default function CallingSettingsPage() {
  return (
    <SettingsPage
      title="Calling"
      description="Manage phone numbers, call routing, and browser calling for your team."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <CallingSettings />
      </SettingsForm>
    </SettingsPage>
  )
}
