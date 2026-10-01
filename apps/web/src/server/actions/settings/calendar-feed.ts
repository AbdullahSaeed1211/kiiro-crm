'use server'

import { actionFailure, actionOk, type ActionResult } from '../../action-result'
import { getProductContext } from '../../auth/context'
import { clearCalendarToken, rotateCalendarToken } from '../../calendar/feed'

// Only these actions are exported: every export of a 'use server' file becomes callable from the client.
/** Makes (or replaces) the signed-in user's calendar feed and returns the secret in its address. */
export async function createCalendarFeed(): Promise<ActionResult<{ token: string }>> {
  try {
    const context = await getProductContext()
    return actionOk({ token: await rotateCalendarToken(context.payload, String(context.user.id)) })
  } catch (error) {
    return actionFailure(error, 'createCalendarFeed', 'Unable to make the feed.')
  }
}

/** Turns the signed-in user's calendar feed off. */
export async function removeCalendarFeed(): Promise<ActionResult> {
  try {
    const context = await getProductContext()
    await clearCalendarToken(context.payload, String(context.user.id))
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'removeCalendarFeed', 'Unable to turn the feed off.')
  }
}
