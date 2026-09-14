/* eslint-disable complexity, max-statements, max-lines-per-function, sonarjs/cognitive-complexity -- persisted wizard state is normalized and merged atomically in this action. */
'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '../../auth/context'
import { applyTemplate } from './apply-template'

export async function saveOnboardingStep(step: string, input: unknown) {
  const context = await requireRole('owner')
  if (step === '') return { ok: false, error: 'A step is required.' } as const
  const data = typeof input === 'object' && input !== null ? { ...(input as Record<string, unknown>) } : {}
  if (typeof data.weekStartsOn === 'string') data.weekStartsOn = Number(data.weekStartsOn)
  if (typeof data.stalledDays === 'string') data.stalledDays = Number(data.stalledDays)
  const current = (await context.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })) as unknown as Record<string, unknown>
  const terminology =
    typeof current.terminology === 'object' && current.terminology !== null && !Array.isArray(current.terminology)
      ? (current.terminology as Record<string, unknown>)
      : {}
  const onboarding =
    typeof terminology.__onboarding === 'object' && terminology.__onboarding !== null
      ? (terminology.__onboarding as Record<string, unknown>)
      : {}
  const completed =
    typeof onboarding.completed === 'object' && onboarding.completed !== null
      ? (onboarding.completed as Record<string, boolean>)
      : {}
  const values =
    typeof onboarding.values === 'object' && onboarding.values !== null
      ? (onboarding.values as Record<string, unknown>)
      : {}
  completed[step] = true
  const nextStep = Math.min(Math.max(Number(onboarding.currentStep ?? 0), 0) + 1, 6)
  const update = step === 'workspace' ? data : {}
  values[step] = data
  if (step === 'template') {
    const applied = await applyTemplate(
      { payload: context.payload, req: context.req },
      typeof data.template === 'string' ? data.template : '',
    )
    if (!applied.ok) return applied
  }
  try {
    await context.payload.updateGlobal({
      slug: 'settings',
      data: { ...update, terminology: { ...terminology, __onboarding: { currentStep: nextStep, completed, values } } },
      overrideAccess: true,
      req: context.req,
    })
    revalidatePath('/onboarding')
    return { ok: true, data: { step } } as const
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save onboarding.' } as const
  }
}

export async function setOnboardingStep(step: number) {
  const context = await requireRole('owner')
  const settings = (await context.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    req: context.req,
  })) as unknown as Record<string, unknown>
  const terminology =
    typeof settings.terminology === 'object' && settings.terminology !== null && !Array.isArray(settings.terminology)
      ? (settings.terminology as Record<string, unknown>)
      : {}
  const currentProgress =
    typeof terminology.__onboarding === 'object' && terminology.__onboarding !== null
      ? (terminology.__onboarding as Record<string, unknown>)
      : {}
  await context.payload.updateGlobal({
    slug: 'settings',
    data: {
      terminology: {
        ...terminology,
        __onboarding: { ...currentProgress, currentStep: Math.min(Math.max(step, 0), 6) },
      },
    },
    overrideAccess: true,
    req: context.req,
  })
  revalidatePath('/onboarding')
  return { ok: true } as const
}

export async function completeOnboarding() {
  const context = await requireRole('owner')
  await context.payload.updateGlobal({
    slug: 'settings',
    data: { onboardedAt: Date.now() },
    overrideAccess: true,
    req: context.req,
  })
  revalidatePath('/onboarding')
  return { ok: true } as const
}
