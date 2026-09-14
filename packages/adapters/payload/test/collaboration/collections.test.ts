import type { CollectionConfig } from 'payload'
import { describe, expect, it } from 'vitest'
import {
  collaborationAttachmentsCollection,
  commentsCollection,
  collaborationNotificationsCollection,
  layoutsCollection,
  notificationPrefsCollection,
  savedViewsCollection,
} from '../../src/collections/collaboration'

const fieldsOf = (collection: CollectionConfig): unknown[] =>
  collection.fields.map((field): unknown => Reflect.get(field, 'name'))

describe('collaboration collection contracts', () => {
  it('declares comments, notifications, preferences, views and layouts', () => {
    expect(fieldsOf(commentsCollection)).toEqual(
      expect.arrayContaining(['recordType', 'recordId', 'author', 'body', 'mentions', 'deletedAt']),
    )
    expect(fieldsOf(collaborationNotificationsCollection)).toEqual(
      expect.arrayContaining(['user', 'type', 'dedupeKey', 'readAt']),
    )
    expect(fieldsOf(notificationPrefsCollection)).toEqual(
      expect.arrayContaining(['user', 'channels', 'digestLocalTime']),
    )
    expect(fieldsOf(savedViewsCollection)).toEqual(
      expect.arrayContaining(['recordType', 'owner', 'kind', 'filter', 'columns', 'isDefault']),
    )
    expect(fieldsOf(layoutsCollection)).toEqual(
      expect.arrayContaining(['recordType', 'sidebarFields', 'quickCreateFields']),
    )
  })

  it('keeps attachment persistence private and indexed by its record parent', () => {
    expect(fieldsOf(collaborationAttachmentsCollection)).toEqual(
      expect.arrayContaining(['recordType', 'recordId', 'fileKey', 'fileName', 'mime', 'uploadedBy']),
    )
    expect(collaborationAttachmentsCollection.indexes).toEqual([{ fields: ['recordType', 'recordId'] }])
    const upload = collaborationAttachmentsCollection.upload
    const mimeTypes = typeof upload === 'object' ? upload.mimeTypes : []
    expect(mimeTypes).toEqual(expect.arrayContaining(['application/pdf', 'application/zip']))
    expect(collaborationAttachmentsCollection.timestamps).toBe(true)
    expect(collaborationAttachmentsCollection.versions).toBe(false)
  })
})
