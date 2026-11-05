'use server'

import { issuePortalLink, revokePortalLink } from '@ops/module-billing'
import { revalidatePath } from 'next/cache'
import { actionFailure, toActionResult, type ActionResult } from '../../action-result'
import { portalUrl } from '../../auth/invitation-url'
import { portalStaffDeps } from '../../billing/portal-deps'

/** Creates a portal link for a client contact and returns its address once, to copy or email. */
export async function sharePortal(input: unknown): Promise<ActionResult<{ url: string; email: string }>> {
  try {
    const result = await issuePortalLink(await portalStaffDeps(), input)
    if (!result.ok) return toActionResult(result)
    revalidatePath(`/organizations/${result.value.link.organizationId}`)
    return { ok: true, data: { url: portalUrl(result.value.token), email: result.value.link.email } }
  } catch (error) {
    return actionFailure(error, 'sharePortal', 'Unable to create the portal link. Try again.')
  }
}

/** Stops a portal link from working. */
export async function revokePortal(input: unknown): Promise<ActionResult> {
  try {
    const result = await revokePortalLink(await portalStaffDeps(), input)
    if (!result.ok) return toActionResult(result)
    revalidatePath(`/organizations/${result.value.organizationId}`)
    return { ok: true, data: undefined }
  } catch (error) {
    return actionFailure(error, 'revokePortal', 'Unable to revoke the link. Try again.')
  }
}
