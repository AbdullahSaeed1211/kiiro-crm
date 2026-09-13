import { createJsonLogger } from '@ops/kernel'
import { INTERNAL_ROUTES, type InternalForwardEnv } from '../contracts/worker'
import { postInternal } from './post-internal'

const logger = createJsonLogger()

/** Forwards a cron trigger to the tenant's internal cron route; a failed run is logged because a trigger has no caller. */
export async function dispatchCron(env: InternalForwardEnv, scheduledTime: number): Promise<void> {
  const body = JSON.stringify({ scheduledTime })
  const response = await postInternal(env, INTERNAL_ROUTES.cron, { body, contentType: 'application/json' })
  if (!response.ok) logger.error('cron.dispatch_failed', { status: response.status, scheduledTime })
}
