import type { Payload } from 'payload'

interface DealStore {
  updateMany(args: object): Promise<unknown>
}

/**
 * Puts every deal's amount in the workspace currency. The numbers are kept as they are, not converted: changing the
 * currency says what the existing amounts are, it does not revalue them. It skips per-deal hooks on purpose, so the
 * change makes no activity entries or webhook calls, and it is safe to repeat.
 */
export async function restampDealCurrency(payload: Payload, currency: string): Promise<void> {
  const store = payload.db as unknown as DealStore
  await store.updateMany({
    collection: 'deals',
    where: { and: [{ valueCurrency: { exists: true } }, { valueCurrency: { not_equals: currency } }] },
    data: { valueCurrency: currency },
  })
}
