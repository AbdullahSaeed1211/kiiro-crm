'use server'

import { createContact, createOrganization, updateContact, updateOrganization } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { crmDeps } from '../../container'
import { withActorOwner } from './utils'

export async function saveOrganization(input: unknown) {
  const value = input as { id?: string; expectedUpdatedAt?: number; patch?: unknown }
  const deps = await crmDeps()
  const result =
    value.id === undefined
      ? await createOrganization(deps, withActorOwner(input, deps.actor.id))
      : await updateOrganization(deps, input)
  if (result.ok) {
    revalidatePath('/organizations')
    revalidatePath(`/organizations/${result.value.id}`)
  }
  return result
}

export async function saveContact(input: unknown) {
  const value = input as { id?: string }
  const deps = await crmDeps()
  const result =
    value.id === undefined
      ? await createContact(deps, withActorOwner(input, deps.actor.id))
      : await updateContact(deps, input)
  if (result.ok) {
    revalidatePath('/contacts')
    revalidatePath(`/contacts/${result.value.id}`)
  }
  return result
}
