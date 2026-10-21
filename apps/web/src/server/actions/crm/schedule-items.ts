'use server'

import { createScheduleItem, updateScheduleItem } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { crmDeps } from '@/server/container'

/** Adds a callback or appointment to a visible CRM record. */
export async function saveScheduleItem(input: unknown) {
  const result = await createScheduleItem(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/sales')
    revalidatePath('/calendar')
    revalidatePath(`/${result.value.recordType}s/${result.value.recordId}`)
  }
  return result
}

/** Updates a visible schedule item using its last-seen timestamp. */
export async function changeScheduleItem(input: unknown) {
  const result = await updateScheduleItem(await crmDeps(), input)
  if (result.ok) {
    revalidatePath('/sales')
    revalidatePath('/calendar')
    revalidatePath(`/${result.value.recordType}s/${result.value.recordId}`)
  }
  return result
}
