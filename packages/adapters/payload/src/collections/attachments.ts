import { COLLECTIONS, FIELDS } from '../contracts/names'
import { ADMIN_GROUPS, countField, recordReference, relationshipTo, spikeCollection, textField } from './fields'
import { ATTACHMENT_MIME_TYPES } from './values'

/**
 * Files attached to records (spec §9.7). Storage is configured by the app; the 25 MB limit is enforced by the upload
 * route. `fileName` keeps the original name for display next to the stored `filename`.
 */
export const attachmentsCollection = {
  ...spikeCollection({
    slug: COLLECTIONS.attachments,
    admin: {
      group: ADMIN_GROUPS.system,
      useAsTitle: 'fileName',
      defaultColumns: ['fileName', 'recordType', 'sizeBytes'],
    },
    fields: [
      ...recordReference({ required: true }),
      textField('fileName', { required: true, maxLength: 255 }),
      countField('sizeBytes', { required: true }),
      relationshipTo(FIELDS.uploadedBy, COLLECTIONS.users),
    ],
    indexes: [{ fields: ['recordType', 'recordId'] }],
  }),
  // Image cropping and focal points need an image pipeline that Workers do not run.
  upload: { mimeTypes: [...ATTACHMENT_MIME_TYPES], crop: false, focalPoint: false },
}
