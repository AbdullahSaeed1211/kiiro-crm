import { COLLECTIONS } from '../../contracts/names'
import { collaborationCollection, RECORD_REFERENCE_FIELDS } from './fields'
import { ADMIN_GROUPS } from '../fields'

/** Comments keep markdown-lite source, normalized mention ids and soft-delete metadata together. */
export const commentsCollection = collaborationCollection({
  slug: 'comments',
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'body', defaultColumns: ['recordType', 'author', 'createdAt'] },
  fields: [
    ...RECORD_REFERENCE_FIELDS,
    { name: 'author', type: 'relationship', relationTo: COLLECTIONS.users, required: true },
    { name: 'body', type: 'textarea', required: true, maxLength: 10_000 },
    { name: 'mentions', type: 'json', defaultValue: [] },
    { name: 'editedAt', type: 'number', min: 0 },
    { name: 'deletedAt', type: 'number', min: 0 },
  ],
  indexes: [{ fields: ['recordType', 'recordId', 'createdAt'] }],
})
