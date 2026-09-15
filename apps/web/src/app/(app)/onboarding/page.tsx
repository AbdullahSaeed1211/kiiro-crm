/* eslint-disable complexity -- the owner-only page normalizes persisted wizard JSON before rendering. */
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { requireRole } from '../../../server/auth/context'
import { OnboardingWizard } from './onboarding-wizard'

export const dynamic = 'force-dynamic'

function defaultOrigins(): string {
  const configured = Object.prototype.hasOwnProperty.call(process.env, 'TURNSTILE_HOSTNAMES')
    ? process.env.TURNSTILE_HOSTNAMES
    : ''
  const hosts = configured
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
  return hosts.length > 0 ? hosts.map((host) => `https://${host}`).join(', ') : 'http://localhost:3000'
}

function settingText({
  settings,
  key,
  fallback,
}: Readonly<{ settings: Record<string, unknown>; key: string; fallback: string }>): string {
  const value = settings[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

export default async function OnboardingPage() {
  const context = await requireRole('owner')
  const settings = (await context.payload.findGlobal({ slug: 'settings', depth: 0 })) as unknown as Record<
    string,
    unknown
  >
  const terminology =
    typeof settings.terminology === 'object' && settings.terminology !== null && !Array.isArray(settings.terminology)
      ? (settings.terminology as Record<string, unknown>)
      : {}
  const progress =
    typeof terminology.__onboarding === 'object' && terminology.__onboarding !== null
      ? (terminology.__onboarding as Record<string, unknown>)
      : {}
  const completed =
    typeof progress.completed === 'object' && progress.completed !== null
      ? (progress.completed as Record<string, boolean>)
      : {}
  const savedValues =
    typeof progress.values === 'object' && progress.values !== null && !Array.isArray(progress.values)
      ? (progress.values as Record<string, unknown>)
      : {}

  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Onboarding' }]} />
      <PageContent>
        <OnboardingWizard
          initialStep={typeof progress.currentStep === 'number' ? progress.currentStep : 0}
          appName={settingText({ settings, key: 'appName', fallback: '' })}
          timezone={settingText({ settings, key: 'timezone', fallback: 'UTC' })}
          currency={settingText({ settings, key: 'currency', fallback: 'USD' })}
          locale={settingText({ settings, key: 'locale', fallback: 'en' })}
          completed={completed}
          savedValues={savedValues}
          defaultOrigins={defaultOrigins()}
        />
      </PageContent>
    </>
  )
}
