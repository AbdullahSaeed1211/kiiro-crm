import type { UnitOfWork } from '@ops/platform'
import { commitTransaction, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

/** Outcome of asking the database adapter for a transaction. */
export interface TransactionProbe {
  readonly supported: boolean
  readonly detail: string
}

/**
 * Runs work inside a Payload transaction on `req` when the database adapter starts one and this call owns it;
 * otherwise the writes run in order without atomicity, and commands rely on idempotency instead (decision D-36).
 */
export function createUnitOfWork(req: PayloadRequest): UnitOfWork {
  return {
    run: async (work) => {
      const owns = await initTransaction(req)
      try {
        const result = await work()
        if (owns) await commitTransaction(req)
        return result
      } catch (error) {
        if (owns) await killTransaction(req)
        throw error
      }
    },
  }
}

/** Starts and rolls back one transaction to learn whether the database adapter supports transactions. */
export async function probeTransactions(payload: Payload): Promise<TransactionProbe> {
  try {
    const id = await payload.db.beginTransaction()
    if (id === null) return { supported: false, detail: 'beginTransaction returned null' }
    await payload.db.rollbackTransaction(id)
    return { supported: true, detail: `transaction ${String(id)} started and rolled back` }
  } catch (error) {
    return { supported: false, detail: error instanceof Error ? error.message : String(error) }
  }
}
