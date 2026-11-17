import type { VoiceNumberProcessorDeps } from './processor-types'

/** Reconcile a bounded batch of number orders before exposing them as usable. */
export async function reconcileVoiceNumbers(deps: VoiceNumberProcessorDeps, limit = 25): Promise<number> {
  const numbers = (await deps.repo.listNumbers())
    .filter(
      (number) => number.status === 'pending' && number.providerNumberId !== null && number.providerOrderId !== null,
    )
    .slice(0, Math.max(1, Math.min(100, limit)))
  let reconciled = 0
  for (const number of numbers) {
    const { providerNumberId, providerOrderId } = number
    if (providerNumberId === null || providerOrderId === null) continue
    const status = await deps.provider.verifyNumber({ providerNumberId, orderId: providerOrderId })
    if (status === 'pending') continue
    await deps.repo.saveNumber({
      ...number,
      status,
      inboundEnabled: status === 'active' && number.inboundEnabled,
      outboundEnabled: status === 'active' && number.outboundEnabled,
      updatedAt: Date.now(),
    })
    reconciled += 1
  }
  return reconciled
}
