import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, relationshipTo, spikeCollection, textField } from './fields'

/** Immutable reported/received pairs. Only authorized attendance commands can write. */
export const attendanceCollection = spikeCollection({
  slug: COLLECTIONS.attendance,
  admin: {
    group: ADMIN_GROUPS.people,
    defaultColumns: ['user', 'reportedCheckInAt', 'submittedAt', 'reportedCheckOutAt'],
  },
  fields: [
    relationshipTo('user', COLLECTIONS.users, { required: true, index: true }),
    textField('openKey', { unique: true }),
    epochMs('reportedCheckInAt', { required: true }),
    epochMs('submittedAt', { required: true, index: true }),
    epochMs('reportedCheckOutAt'),
    epochMs('checkOutSubmittedAt'),
    textField('note', { maxLength: 500 }),
    textField('checkOutNote', { maxLength: 500 }),
  ],
})
