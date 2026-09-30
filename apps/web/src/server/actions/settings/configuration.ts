'use server'

import { revalidatePath } from 'next/cache'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { payloadData } from '../../auth/api'
import { requireRole, type ProductContext } from '../../auth/context'
import { recordOf, stringValue } from './input'

const CONFIGURATION_COLLECTIONS = ['fieldDefinitions', 'workflows', 'savedViews', 'layouts']

function configurationCollection(data: Record<string, unknown>): string | undefined {
  const collection = stringValue(data.collection)
  return collection !== undefined && CONFIGURATION_COLLECTIONS.includes(collection) ? collection : undefined
}

/** The record values to save: everything but the routing keys, with a new saved view owned by its creator. */
function configurationValues(data: Record<string, unknown>, ownerId: string): Record<string, unknown> {
  const values = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'collection' && key !== 'id'))
  return data.collection === 'savedViews' && values.owner === undefined ? { ...values, owner: ownerId } : values
}

function refreshConfiguration(collection: string): void {
  revalidatePath('/settings')
  if (collection === 'savedViews') revalidatePath('/settings/views')
}

export async function saveConfiguration(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const collection = configurationCollection(data)
  if (collection === undefined) return actionError('VALIDATION', 'Configuration collection is invalid.')
  const id = stringValue(data.id)
  const values = configurationValues(data, context.actor.id)
  try {
    const dataPayload = payloadData(context.payload)
    const write = { collection, data: values, overrideAccess: false, req: context.req }
    if (id === undefined) await dataPayload.create(write)
    else await dataPayload.update({ ...write, id })
    refreshConfiguration(collection)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveConfiguration', 'Unable to save configuration.')
  }
}

/** Deletes one configuration record after the collection access policy checks ownership. */
export async function deleteConfiguration(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const collection = configurationCollection(data)
  const id = stringValue(data.id)
  if (collection === undefined) return actionError('VALIDATION', 'Configuration collection is invalid.')
  if (id === undefined) return actionError('VALIDATION', 'Configuration id is required.')
  try {
    await payloadData(context.payload).delete({ collection, id, overrideAccess: false, req: context.req })
    refreshConfiguration(collection)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'deleteConfiguration', 'Unable to delete configuration.')
  }
}

async function clearSiblingDefaults(
  dataPayload: ReturnType<typeof payloadData>,
  view: { readonly id: string | number; readonly owner?: unknown; readonly recordType?: unknown },
  req: ProductContext['req'],
): Promise<void> {
  const owner = typeof view.owner === 'string' ? view.owner : null
  const where =
    owner === null
      ? {
          and: [
            { recordType: { equals: view.recordType } },
            { or: [{ owner: { equals: null } }, { owner: { exists: false } }] },
          ],
        }
      : { and: [{ recordType: { equals: view.recordType } }, { owner: { equals: owner } }] }
  const siblings = await dataPayload.find({
    collection: 'savedViews',
    where,
    limit: 100,
    depth: 0,
    overrideAccess: false,
    req,
  })
  await Promise.all(
    siblings.docs
      .filter(
        (sibling): sibling is NonNullable<typeof sibling> =>
          sibling !== undefined && String(sibling.id) !== String(view.id) && sibling.isDefault === true,
      )
      .map((sibling) =>
        dataPayload.update({
          collection: 'savedViews',
          id: sibling.id,
          data: { isDefault: false },
          overrideAccess: false,
          req,
        }),
      ),
  )
}

function savedViewStateInput(
  data: Record<string, unknown>,
): { readonly id: string; readonly pinned?: boolean; readonly isDefault?: boolean } | ActionResult {
  const id = stringValue(data.id)
  const pinned = typeof data.pinned === 'boolean' ? data.pinned : undefined
  const isDefault = typeof data.isDefault === 'boolean' ? data.isDefault : undefined
  return id === undefined || (pinned === undefined && isDefault === undefined)
    ? actionError('VALIDATION', 'A view and a state change are required.')
    : { id, ...(pinned === undefined ? {} : { pinned }), ...(isDefault === undefined ? {} : { isDefault }) }
}

export async function setSavedViewState(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = savedViewStateInput(recordOf(input))
  if ('ok' in parsed) return parsed
  try {
    const dataPayload = payloadData(context.payload)
    const found = await dataPayload.find({
      collection: 'savedViews',
      where: { id: { equals: parsed.id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    })
    const view = found.docs.at(0)
    if (view === undefined) return actionError('NOT_FOUND', 'Saved view not found.')
    if (parsed.isDefault === true) await clearSiblingDefaults(dataPayload, view, context.req)
    await dataPayload.update({
      collection: 'savedViews',
      id: parsed.id,
      data: {
        ...(parsed.pinned === undefined ? {} : { pinned: parsed.pinned }),
        ...(parsed.isDefault === undefined ? {} : { isDefault: parsed.isDefault }),
      },
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath('/settings/views')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'setSavedViewState', 'Unable to update saved view.')
  }
}
