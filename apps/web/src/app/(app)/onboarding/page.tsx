import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { requireRole } from '../../../server/auth/context'
import { completeOnboarding, saveOnboardingStep } from '../../../server/actions/onboarding'

export const dynamic = 'force-dynamic'

function settingText({
  settings,
  key,
  fallback,
}: Readonly<{ settings: Record<string, unknown>; key: string; fallback: string }>): string {
  const value = settings[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

// The onboarding step is intentionally rendered as one cohesive server form.
// eslint-disable-next-line max-lines-per-function
export default async function OnboardingPage() {
  const context = await requireRole('owner')
  const settings = (await context.payload.findGlobal({ slug: 'settings', depth: 0 })) as unknown as Record<
    string,
    unknown
  >
  const done = typeof settings.onboardedAt === 'number' && settings.onboardedAt > 0

  async function saveWorkspace(formData: FormData) {
    'use server'
    await saveOnboardingStep('workspace', Object.fromEntries(formData.entries()))
  }

  async function finish() {
    'use server'
    await completeOnboarding()
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Onboarding' }]} />
      <PageContent>
        <div className="mx-auto grid w-full max-w-4xl gap-8 md:grid-cols-[13rem_1fr]">
          <aside className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Workspace setup</p>
            {['Workspace', 'Branding', 'Template', 'Team', 'Lead intake', 'Import', 'Done'].map((step, index) => (
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm" key={step}>
                <span className="flex size-6 items-center justify-center rounded-full border text-xs">{index + 1}</span>
                {step}
              </div>
            ))}
          </aside>
          <section className="space-y-6 rounded-xl border bg-background p-6 shadow-sm">
            <div>
              <p className="text-sm text-muted-foreground">{done ? 'Setup complete' : 'Step 1 of 7'}</p>
              <h1 className="text-2xl font-semibold tracking-tight">Tell us about your workspace</h1>
              <p className="mt-2 text-sm text-muted-foreground">These defaults can be changed later in Settings.</p>
            </div>
            <form action={saveWorkspace} className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm sm:col-span-2">
                Workspace name
                <input
                  className="h-10 rounded-md border px-3"
                  name="appName"
                  defaultValue={settingText({ settings, key: 'appName', fallback: '' })}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                Time zone
                <input
                  className="h-10 rounded-md border px-3"
                  name="timezone"
                  defaultValue={settingText({ settings, key: 'timezone', fallback: 'UTC' })}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                Currency
                <input
                  className="h-10 rounded-md border px-3"
                  name="currency"
                  defaultValue={settingText({ settings, key: 'currency', fallback: 'USD' })}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                Locale
                <select
                  className="h-10 rounded-md border px-3"
                  name="locale"
                  defaultValue={settingText({ settings, key: 'locale', fallback: 'en' })}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Week starts on
                <select
                  className="h-10 rounded-md border px-3"
                  name="weekStartsOn"
                  defaultValue={settingText({ settings, key: 'weekStartsOn', fallback: '0' })}
                >
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                </select>
              </label>
              <button
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-2"
                type="submit"
              >
                Save and continue
              </button>
            </form>
            <form action={finish}>
              <button className="text-sm text-muted-foreground underline-offset-4 hover:underline" type="submit">
                Skip to dashboard
              </button>
            </form>
          </section>
        </div>
      </PageContent>
    </>
  )
}
