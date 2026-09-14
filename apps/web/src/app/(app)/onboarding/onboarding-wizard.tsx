/* eslint-disable complexity, max-lines-per-function, no-nested-ternary, sonarjs/no-nested-conditional, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unnecessary-condition -- the wizard intentionally keeps seven small steps in one resumable client surface. */
'use client'

import { useState } from 'react'
import { TEMPLATE_KEYS, TEMPLATE_LABELS } from '@ops/templates'
import { completeOnboarding, saveOnboardingStep, setOnboardingStep } from '../../../server/actions/onboarding'

const STEPS = [
  ['workspace', 'Workspace'],
  ['branding', 'Branding'],
  ['template', 'Business type'],
  ['team', 'Team'],
  ['intake', 'Lead intake'],
  ['import', 'Import'],
  ['done', 'Done'],
] as const

export function OnboardingWizard({
  initialStep,
  appName,
  timezone,
  currency,
  locale,
  completed,
  savedValues,
  defaultOrigins,
}: Readonly<{
  initialStep: number
  appName: string
  timezone: string
  currency: string
  locale: string
  completed: Record<string, boolean>
  savedValues: Record<string, unknown>
  defaultOrigins: string
}>) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), 6))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const saved = (key: string): Record<string, string> => {
    const value = savedValues[key]
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === 'string')) as Record<
          string,
          string
        >)
      : {}
  }
  const [values, setValues] = useState({
    appName,
    timezone,
    currency,
    locale,
    teamEmail: saved('team').teamEmail || 'manager@example.test',
    origins: saved('intake').origins || defaultOrigins,
    template: saved('template').template ?? 'blank',
  })
  const current = STEPS[step]
  const update = (key: string, value: string) => setValues((state) => ({ ...state, [key]: value }))
  const save = async () => {
    setBusy(true)
    setMessage('')
    if (current[0] === 'done') {
      await completeOnboarding()
      setMessage('Setup complete. Your workspace is ready.')
    } else {
      const result = await saveOnboardingStep(
        current[0],
        current[0] === 'workspace' ? values : { ...values, completed: true },
      )
      if (!result.ok) setMessage(result.error)
      else {
        const next = Math.min(step + 1, 6)
        setStep(next)
        await setOnboardingStep(next)
      }
    }
    setBusy(false)
  }
  const back = async () => {
    const next = Math.max(step - 1, 0)
    setStep(next)
    await setOnboardingStep(next)
  }
  return (
    <div className="ops-onboarding grid w-full gap-6 md:grid-cols-[13rem_1fr]">
      <aside className="space-y-1">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace setup</p>
        {STEPS.map(([key, label], index) => (
          <button
            className={`flex w-full items-center gap-2 border-l-2 px-2 py-2 text-left text-sm ${index === step ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground'}`}
            key={key}
            type="button"
            onClick={() => {
              setStep(index)
              void setOnboardingStep(index)
            }}
          >
            <span className="grid size-5 place-items-center border text-[10px]">
              {completed[key] || index < step ? '✓' : index + 1}
            </span>
            {label}
          </button>
        ))}
      </aside>
      <section className="ops-onboarding-card space-y-5 border bg-background p-5">
        <div>
          <p className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-1 text-xl font-semibold">{current[1]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Save this step and come back any time.</p>
        </div>
        {current[0] === 'workspace' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm sm:col-span-2">
              Workspace name
              <input
                className="h-9 border px-3"
                value={values.appName}
                onChange={(event) => update('appName', event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              Time zone
              <input
                className="h-9 border px-3"
                value={values.timezone}
                onChange={(event) => update('timezone', event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              Currency
              <input
                className="h-9 border px-3"
                value={values.currency}
                onChange={(event) => update('currency', event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              Locale
              <select
                className="h-9 border px-3"
                value={values.locale}
                onChange={(event) => update('locale', event.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
          </div>
        ) : null}
        {current[0] === 'branding' ? (
          <p className="text-sm text-muted-foreground">
            Branding is optional. You can upload a logo and favicon later from Settings → Branding.
          </p>
        ) : null}
        {current[0] === 'template' ? (
          <div className="grid max-w-sm gap-2">
            <label className="grid gap-1 text-sm" htmlFor="business-type">
              Business type
            </label>
            <p className="text-xs text-muted-foreground" id="business-type-help">
              Choose a starting preset for terminology and workflows. You can refine fields and stages later.
            </p>
            <select
              aria-describedby="business-type-help"
              id="business-type"
              className="h-9 border px-3"
              value={values.template}
              onChange={(event) => update('template', event.target.value)}
            >
              {TEMPLATE_KEYS.map((value) => (
                <option key={value} value={value}>
                  {TEMPLATE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {current[0] === 'team' ? (
          <label className="grid max-w-sm gap-1 text-sm">
            Invite a teammate (optional)
            <input
              className="h-9 border px-3"
              type="email"
              placeholder="name@company.com"
              value={values.teamEmail || 'manager@example.test'}
              onChange={(event) => update('teamEmail', event.target.value)}
            />
          </label>
        ) : null}
        {current[0] === 'intake' ? (
          <label className="grid max-w-sm gap-1 text-sm">
            Lead sources (optional)
            <input
              className="h-9 border px-3"
              placeholder="Website, referral"
              value={values.origins || defaultOrigins}
              onChange={(event) => update('origins', event.target.value)}
            />
          </label>
        ) : null}
        {current[0] === 'import' ? (
          <p className="text-sm text-muted-foreground">
            You can import contacts and leads later. Continue when you are ready.
          </p>
        ) : null}
        {current[0] === 'done' ? (
          <p className="text-sm text-muted-foreground">Review complete. Finish to open the workspace.</p>
        ) : null}
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
        <div className="flex justify-between border-t pt-4">
          <button
            className="h-9 border px-3 text-sm"
            type="button"
            disabled={step === 0 || busy}
            onClick={() => void back()}
          >
            Back
          </button>
          <button
            className="h-9 bg-primary px-4 text-sm font-medium text-primary-foreground"
            type="button"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : step === 6 ? 'Finish setup' : 'Save and continue'}
          </button>
        </div>
      </section>
    </div>
  )
}
