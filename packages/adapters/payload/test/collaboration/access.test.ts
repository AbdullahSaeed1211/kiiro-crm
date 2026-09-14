import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import {
  attachmentDelete,
  canReadParentReference,
  commentDelete,
  commentUpdate,
  collaborationCollection,
  layoutAccess,
  notificationAccess,
  parentScopedCreate,
  parentScopedRead,
  savedViewAccess,
} from '../../src/collections/collaboration/fields'
import { commentsCollection } from '../../src/collections/collaboration'

function request(
  user: Record<string, unknown>,
  findByID: (args: { collection: string }) => Promise<unknown> = ({ collection }) => {
    if (collection === 'comments')
      return Promise.resolve({
        id: 'comment-1',
        author: 'staff-1',
        recordType: 'lead',
        recordId: 'lead-1',
        createdAt: new Date().toISOString(),
      })
    if (collection === 'attachments')
      return Promise.resolve({ id: 'file-1', uploadedBy: 'staff-1', recordType: 'lead', recordId: 'lead-1' })
    return Promise.resolve({ id: 'lead-1' })
  },
) {
  return { user, payload: { find: () => Promise.resolve({ docs: [{ id: 'lead-1' }] }), findByID } } as never
}

const staff = { id: asId('staff-1'), role: 'staff', active: true }
const other = { id: asId('other-1'), role: 'staff', active: true }
const manager = { id: asId('manager-1'), role: 'manager', active: true }
const inactive = { id: asId('staff-1'), role: 'staff', active: false }

function commentHookArgs(data: Record<string, unknown>): Record<string, unknown> {
  return {
    data,
    operation: 'update',
    originalDoc: { body: 'old', author: 'staff-1', recordType: 'lead', recordId: 'lead-1' },
    req: request(staff),
  }
}

describe('collaboration access scope', () => {
  it('fails closed for anonymous and inactive actors', async () => {
    expect(await parentScopedRead({ req: request(inactive) })).toBe(false)
    expect(await layoutAccess.read({ req: request(inactive) })).toBe(false)
    expect(await notificationAccess.read({ req: request(inactive) })).toBe(false)
  })

  it('scopes parent-linked writes and deletes to the authenticated actor role', async () => {
    const staffRequest = request(staff)
    expect(await parentScopedCreate({ req: staffRequest, data: { recordType: 'lead', recordId: 'lead-1' } })).toBe(true)
    expect(await parentScopedCreate({ req: staffRequest, data: { recordType: 'unknown', recordId: 'secret' } })).toBe(
      false,
    )
    expect(await commentUpdate({ req: staffRequest, id: 'comment-1' })).toBe(true)
    expect(await commentUpdate({ req: request(other), id: 'comment-1' })).toBe(false)
    expect(await commentDelete({ req: request(other), id: 'comment-1' })).toBe(false)
    expect(await commentDelete({ req: request(manager), id: 'comment-1' })).toBe(true)
    expect(await attachmentDelete({ req: staffRequest, id: 'file-1' })).toBe(true)
    expect(await attachmentDelete({ req: request(other), id: 'file-1' })).toBe(false)
  })

  it('requires an existing parent even for managers and owners', async () => {
    const missingParent = () => Promise.reject(new Error('Not found'))
    expect(
      await canReadParentReference(request(manager, missingParent), { recordType: 'lead', recordId: 'missing' }),
    ).toBe(false)
    expect(await canReadParentReference(request(manager), { recordType: 'lead', recordId: 'lead-1' })).toBe(true)
    expect(
      await canReadParentReference(request({ id: 'owner-1', role: 'owner', active: true }, missingParent), {
        recordType: 'lead',
        recordId: 'missing',
      }),
    ).toBe(false)
  })
})

describe('comment write normalization', () => {
  it('recomputes update mentions and rejects parent or author injection', async () => {
    const beforeChange = commentsCollection.hooks?.beforeChange?.[0]
    expect(beforeChange).toBeDefined()
    const hook = beforeChange as (args: Record<string, unknown>) => Promise<Record<string, unknown>>
    const updated = await hook(commentHookArgs({ body: '@[Sam](sam-1)' }))
    expect(updated['mentions']).toEqual(['sam-1'])
    await expect(hook(commentHookArgs({ recordId: 'secret-lead' }))).rejects.toThrow('cannot be changed')
  })

  it('returns self filters for notifications', async () => {
    const selfFilter = await notificationAccess.read({ req: request(staff) })
    expect(selfFilter).toEqual({ user: { equals: 'staff-1' } })
  })

  it('protects personal/shared views and manager-only layouts', async () => {
    expect(await savedViewAccess.create({ req: request(staff), data: { owner: null } })).toBe(false)
    expect(await savedViewAccess.create({ req: request(staff), data: { owner: 'staff-1' } })).toBe(true)
    expect(await savedViewAccess.create({ req: request(manager), data: { owner: 'staff-1' } })).toBe(false)
    expect(await savedViewAccess.create({ req: request(manager), data: { owner: null } })).toBe(true)
    const personalView = () => Promise.resolve({ id: 'view-1', owner: 'staff-1' })
    expect(await savedViewAccess.update({ req: request(manager, personalView), id: 'view-1' })).toBe(false)
    expect(await savedViewAccess.update({ req: request(staff, personalView), id: 'view-1' })).toBe(true)
    const sharedView = () => Promise.resolve({ id: 'view-2', owner: null })
    expect(await savedViewAccess.update({ req: request(manager, sharedView), id: 'view-2' })).toBe(true)
    expect(await savedViewAccess.update({ req: request(staff, sharedView), id: 'view-2' })).toBe(false)
    expect(await layoutAccess.update({ req: request(staff) })).toBe(false)
    expect(await layoutAccess.update({ req: request(manager) })).toBe(true)
  })

  it('keeps the collection helper fail-closed unless a leaf supplies its access matrix', () => {
    const config = collaborationCollection({ slug: 'example', admin: {}, fields: [] })
    expect(config.access?.read?.({ req: request(staff) })).toBe(false)
  })
})
