import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, relationshipTo, spikeCollection, textField } from './fields'

/**
 * Client portal links. Only the SHA-256 of a link's token is stored. Writes are system work done by the portal use
 * cases; owners and managers read the list on a client's page.
 */
export const portalLinksCollection = spikeCollection({
  slug: COLLECTIONS.portalLinks,
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'email', defaultColumns: ['email', 'expiresAt', 'revokedAt'] },
  fields: [
    relationshipTo('organization', COLLECTIONS.organizations, { required: true, index: true }),
    relationshipTo('contact', COLLECTIONS.contacts, { required: true }),
    { name: 'email', type: 'email', required: true },
    textField('tokenHash', { required: true, unique: true, index: true, maxLength: 64 }),
    epochMs('expiresAt', { required: true }),
    epochMs('revokedAt'),
    epochMs('lastOpenedAt'),
    relationshipTo('createdBy', COLLECTIONS.users),
  ],
})
