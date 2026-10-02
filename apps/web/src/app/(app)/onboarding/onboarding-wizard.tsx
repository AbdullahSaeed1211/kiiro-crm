'use client'

import { Button } from '@ops/ui/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { ONBOARDING_COPY, type OnboardingCopy } from '../../../i18n/onboarding-copy'
import { completeOnboarding, saveOnboardingStep, setOnboardingStep } from '../../../server/actions/onboarding'
import { PointerStep, TemplateStep, WorkspaceStep, type WizardValues } from './onboarding-steps'
import { TeamStep } from './team-step'

const STEP_KEYS = ['workspace', 'branding', 'template', 'team', 'intake', 'import', 'done'] as const
const LAST_STEP = STEP_KEYS.length - 1

interface WizardProps {
  readonly initialStep: number
  readonly appName: string
  readonly timezone: string
  readonly currency: string
  readonly locale: string
  readonly completed: Record<string, boolean>
  readonly savedValues: Record<string, unknown>
}

function buttonLabel(copy: OnboardingCopy, state: Readonly<{ busy: boolean; last: boolean }>): string {
  if (state.busy) return copy.saving
  return state.last ? copy.finish : copy.saveAndContinue
}

/** The template the owner already picked, if one was saved. */
function savedTemplate(savedValues: Record<string, unknown>): string {
  const value = savedValues.template as { template?: unknown } | null | undefined
  return typeof value?.template === 'string' ? value.template : 'blank'
}

function StepList({
  step,
  completed,
  onPick,
}: Readonly<{ step: number; completed: Record<string, boolean>; onPick: (index: number) => void }>) {
  const copy = catalogFor(ONBOARDING_COPY, useLocale())
  return (
    <aside className="space-y-1">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.heading}</p>
      {STEP_KEYS.map((key, index) => (
        <Button
          key={key}
          type="button"
          variant="ghost"
          className={`h-auto w-full justify-start gap-2 rounded-none border-l-2 px-2 py-2 text-left font-normal ${index === step ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground'}`}
          onClick={() => {
            onPick(index)
          }}
        >
          <span className="grid size-5 place-items-center border text-[10px]">
            {completed[key] || index < step ? '✓' : index + 1}
          </span>
          {copy.steps[key]}
        </Button>
      ))}
    </aside>
  )
}

function StepBody({
  stepKey,
  copy,
  values,
  update,
}: Readonly<{
  stepKey: (typeof STEP_KEYS)[number]
  copy: OnboardingCopy
  values: WizardValues
  update: (field: keyof WizardValues, value: string) => void
}>) {
  if (stepKey === 'workspace') return <WorkspaceStep copy={copy} values={values} update={update} />
  if (stepKey === 'template') return <TemplateStep copy={copy} values={values} update={update} />
  if (stepKey === 'team') return <TeamStep />
  if (stepKey === 'intake' || stepKey === 'import') return <PointerStep kind={stepKey} copy={copy} />
  return <p className="text-sm text-muted-foreground">{stepKey === 'done' ? copy.doneHint : copy.brandingHint}</p>
}

export function OnboardingWizard(props: WizardProps) {
  const copy = catalogFor(ONBOARDING_COPY, useLocale())
  const router = useRouter()
  const [step, setStep] = useState(Math.min(Math.max(props.initialStep, 0), LAST_STEP))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [values, setValues] = useState<WizardValues>({
    appName: props.appName,
    timezone: props.timezone,
    currency: props.currency,
    locale: props.locale,
    template: savedTemplate(props.savedValues),
  })
  const key = STEP_KEYS[step] ?? 'workspace'
  const update = (field: keyof WizardValues, value: string) => {
    setValues((state) => ({ ...state, [field]: value }))
  }
  const goTo = async (index: number) => {
    setStep(index)
    await setOnboardingStep(index)
  }
  const save = async () => {
    setBusy(true)
    setMessage('')
    if (key === 'done') {
      await completeOnboarding()
      setMessage(copy.complete)
      router.push('/')
    } else {
      const result = await saveOnboardingStep(key, key === 'workspace' ? values : { ...values, completed: true })
      if (result.ok) await goTo(Math.min(step + 1, LAST_STEP))
      else setMessage(result.error.message)
    }
    setBusy(false)
  }
  return (
    <div className="ops-onboarding grid w-full gap-6 md:grid-cols-[13rem_1fr]">
      <StepList
        step={step}
        completed={props.completed}
        onPick={(index) => {
          void goTo(index)
        }}
      />
      <section className="ops-onboarding-card space-y-5 border bg-background p-5">
        <div>
          <p className="text-xs text-muted-foreground">
            {copy.stepOf.replace('{step}', String(step + 1)).replace('{total}', String(STEP_KEYS.length))}
          </p>
          <h1 className="mt-1 text-xl font-semibold">{copy.steps[key]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.saveHint}</p>
        </div>
        <StepBody stepKey={key} copy={copy} values={values} update={update} />
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
        <div className="flex justify-between border-t pt-4">
          <Button
            variant="outline"
            size="lg"
            type="button"
            disabled={step === 0 || busy}
            onClick={() => void goTo(Math.max(step - 1, 0))}
          >
            {copy.back}
          </Button>
          <Button size="lg" type="button" disabled={busy} onClick={() => void save()}>
            {buttonLabel(copy, { busy, last: key === 'done' })}
          </Button>
        </div>
      </section>
    </div>
  )
}
