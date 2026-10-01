import { demoCounts, purgeDemoRecords, type DemoStore } from '@ops/adapter-payload'
import { createJsonLogger } from '@ops/kernel'
import { findProductContext, type ProductContext } from '../../../auth/context'
import { resetPipelineCache } from '../../../queries/pipeline-insights'
import { failure, success } from '../../respond'

const logger = createJsonLogger()

/** The owner's context, or the response to send instead (401 without a session, 403 for anyone but an owner). */
async function ownerOnly(): Promise<ProductContext | Response> {
  const context = await findProductContext()
  if (context === null) return failure('UNAUTHORIZED', 'Sign in to use the API.')
  if (context.actor.role !== 'owner') return failure('FORBIDDEN', 'Only an owner can manage demo data.')
  return context
}

const storeOf = (context: ProductContext): DemoStore => context.payload as unknown as DemoStore

/** `GET /api/v1/demo`: whether demo data is present and how many records of each kind. */
export async function GET(): Promise<Response> {
  const context = await ownerOnly()
  if (context instanceof Response) return context
  const counts = await demoCounts(storeOf(context))
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  return success({ present: total > 0, total, counts })
}

/**
 * `DELETE /api/v1/demo`: removes every record the demo data created (its organizations, contacts, leads, deals,
 * projects, tasks, time, history and demo users) and nothing else. Owners only.
 */
export async function DELETE(): Promise<Response> {
  const context = await ownerOnly()
  if (context instanceof Response) return context
  const removed = await purgeDemoRecords(storeOf(context))
  resetPipelineCache()
  logger.info('demo.purged', { actor: String(context.actor.id), removed })
  return success({ removed })
}
