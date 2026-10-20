'use server'

import {
  createContentItem as createContent,
  createDeliverable as createDeliverableCommand,
  respondToDeliverable as respondToDeliverableCommand,
  updateContentItem as updateContent,
} from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { workCommandDeps } from '@/server/container'

export async function createDeliverable(input: unknown) {
  const result = await createDeliverableCommand(await workCommandDeps(), input)
  if (result.ok) revalidatePath(`/projects/${result.value.projectId}`)
  return result
}

export async function respondToDeliverable(input: unknown) {
  const result = await respondToDeliverableCommand(await workCommandDeps(), input)
  if (result.ok) revalidatePath(`/projects/${result.value.projectId}`)
  return result
}

export async function createContentItem(input: unknown) {
  const result = await createContent(await workCommandDeps(), input)
  if (result.ok) revalidatePath('/content-calendar')
  return result
}

export async function updateContentItem(input: unknown) {
  const result = await updateContent(await workCommandDeps(), input)
  if (result.ok) revalidatePath('/content-calendar')
  return result
}
