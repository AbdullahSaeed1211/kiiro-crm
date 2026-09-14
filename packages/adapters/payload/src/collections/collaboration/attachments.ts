import { COLLECTIONS } from '../../contracts/names'
import { collaborationCollection, RECORD_REFERENCE_FIELDS, ATTACHMENT_MIME_TYPES } from './fields'
import { ADMIN_GROUPS } from '../fields'

/** R2-backed record files. The upload route enforces the size and MIME limits before writing the object. */
export const collaborationAttachmentsCollection = collaborationCollection({
  slug: 'attachments',
  admin: {
    group: ADMIN_GROUPS.system,
    useAsTitle: 'fileName',
    defaultColumns: ['fileName', 'recordType', 'sizeBytes'],
  },
  fields: [
    ...RECORD_REFERENCE_FIELDS,
    { name: 'fileKey', type: 'text', required: true, unique: true, maxLength: 500 },
    { name: 'fileName', type: 'text', required: true, maxLength: 255 },
    { name: 'mime', type: 'text', required: true, maxLength: 127 },
    { name: 'sizeBytes', type: 'number', required: true, min: 0 },
    { name: 'uploadedBy', type: 'relationship', relationTo: COLLECTIONS.users, required: true },
  ],
  indexes: [{ fields: ['recordType', 'recordId'] }],
  upload: { mimeTypes: [...ATTACHMENT_MIME_TYPES], crop: false, focalPoint: false },
})
