import { COLLECTIONS } from '../../contracts/names'
import { resolveActor } from '../../access/actor'
import { collaborationCollection, savedViewAccess } from './fields'
import { ADMIN_GROUPS } from '../fields'

function normalizeCreateOwner(input: Record<string, unknown>, actorId: string): void {
  const owner = input['owner']
  if (owner === undefined || owner === null) return
  const ownerId = typeof owner === 'object' ? (owner as Record<string, unknown>)['id'] : owner
  if (String(ownerId) !== actorId) throw new Error('A personal view must belong to the current user.')
  input['owner'] = actorId
}

function preserveOwner(input: Record<string, unknown>, originalDoc: unknown): void {
  if (typeof originalDoc === 'object' && originalDoc !== null)
    input['owner'] = (originalDoc as Record<string, unknown>)['owner']
}

/** Personal and shared list/board/calendar/timeline configurations. */
export const savedViewsCollection = collaborationCollection({
  slug: 'savedViews',
  admin: {
    group: ADMIN_GROUPS.configuration,
    useAsTitle: 'name',
    defaultColumns: ['recordType', 'name', 'kind', 'owner'],
  },
  fields: [
    { name: 'recordType', type: 'text', required: true, index: true },
    { name: 'owner', type: 'relationship', relationTo: COLLECTIONS.users, index: true },
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    { name: 'kind', type: 'select', options: ['table', 'board', 'calendar', 'timeline'], required: true },
    { name: 'filter', type: 'json' },
    { name: 'sort', type: 'json', required: true },
    { name: 'columns', type: 'json', required: true },
    { name: 'pinned', type: 'checkbox', defaultValue: false },
    { name: 'isDefault', type: 'checkbox', defaultValue: false },
  ],
  indexes: [{ fields: ['recordType', 'owner'] }],
  access: savedViewAccess,
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const actor = await resolveActor(req)
        if (actor?.active !== true) throw new Error('An active user is required.')
        const input = data as Record<string, unknown>
        if (operation === 'create') {
          normalizeCreateOwner(input, String(actor.id))
          return input
        }
        preserveOwner(input, originalDoc)
        return input
      },
    ],
  },
})
