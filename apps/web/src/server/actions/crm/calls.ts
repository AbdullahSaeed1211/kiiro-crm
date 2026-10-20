'use server'

import { logCall } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { crmDeps } from '@/server/container'

/** Adds a call to the authorized lead/contact timeline. */
export async function recordCall(input: unknown) {
  const result = await logCall(await crmDeps(), input)
  if (result.ok) revalidatePath(`/${result.value.recordType}s/${result.value.recordId}`)
  return result
}
