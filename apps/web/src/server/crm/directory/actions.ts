'use server'

import { createContact, createOrganization, updateContact, updateOrganization } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { getCrmDeps } from '../deps'

export async function saveOrganization(input: unknown) {
  const value = input as { id?: string; expectedUpdatedAt?: number; patch?: unknown }
  const result =
    value.id === undefined
      ? await createOrganization(await getCrmDeps(), input)
      : await updateOrganization(await getCrmDeps(), input)
  if (result.ok) {
    revalidatePath('/organizations')
    revalidatePath(`/organizations/${result.value.id}`)
  }
  return result
}

export async function saveContact(input: unknown) {
  const value = input as { id?: string }
  const result =
    value.id === undefined
      ? await createContact(await getCrmDeps(), input)
      : await updateContact(await getCrmDeps(), input)
  if (result.ok) {
    revalidatePath('/contacts')
    revalidatePath(`/contacts/${result.value.id}`)
  }
  return result
}
