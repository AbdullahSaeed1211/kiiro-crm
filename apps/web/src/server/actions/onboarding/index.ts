'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '../../auth/context'

export async function saveOnboardingStep(step: string, input: unknown) {
  const context = await requireRole('owner')
  if (step === '') return { ok: false, error: 'A step is required.' } as const
  const data = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  try {
    await context.payload.updateGlobal({ slug: 'settings', data, overrideAccess: true, req: context.req })
    revalidatePath('/onboarding')
    return { ok: true, data: { step } } as const
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save onboarding.' } as const
  }
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
