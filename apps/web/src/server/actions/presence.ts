'use server'

import { createPresenceRepository } from '@ops/adapter-payload'
import { actionFailure, toActionResult } from '@/server/action-result'
import { getRequestContext } from '@/server/container'

/** Stores a private, self-reported app activity heartbeat using UTC epoch milliseconds. */
export async function heartbeatPresence() {
  try {
    const context = await getRequestContext()
    await createPresenceRepository(context.req).heartbeat(String(context.actor.id), Date.now())
    return toActionResult({ ok: true, value: null })
  } catch (error) {
    return actionFailure(error, 'presence.heartbeat', 'Could not update recent activity.')
  }
}

/** Removes the signed-in user's activity signal when they explicitly log out. */
export async function clearPresence() {
  try {
    const context = await getRequestContext()
    await createPresenceRepository(context.req).clear(String(context.actor.id))
    return toActionResult({ ok: true, value: null })
  } catch (error) {
    return actionFailure(error, 'presence.clear', 'Could not clear recent activity.')
  }
}
