import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import {
  attachmentDelete,
  commentDelete,
  commentUpdate,
  collaborationCollection,
  layoutAccess,
  notificationAccess,
  parentScopedCreate,
  parentScopedRead,
  savedViewAccess,
} from '../../src/collections/collaboration/fields'

function request(
  user: Record<string, unknown>,
  findByID = ({ collection }: { collection: string }) => {
    if (collection === 'comments')
      return {
        id: 'comment-1',
        author: 'staff-1',
        recordType: 'lead',
        recordId: 'lead-1',
        createdAt: new Date().toISOString(),
      }
    if (collection === 'attachments')
      return { id: 'file-1', uploadedBy: 'staff-1', recordType: 'lead', recordId: 'lead-1' }
    return { id: 'lead-1' }
  },
) {
  return { user, payload: { find: () => Promise.resolve({ docs: [{ id: 'lead-1' }] }), findByID } } as never
}

const staff = { id: asId('staff-1'), role: 'staff', active: true }
const other = { id: asId('other-1'), role: 'staff', active: true }
const manager = { id: asId('manager-1'), role: 'manager', active: true }
const inactive = { id: asId('staff-1'), role: 'staff', active: false }

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

  it('returns self filters for notifications', async () => {
    const selfFilter = await notificationAccess.read({ req: request(staff) })
    expect(selfFilter).toEqual({ user: { equals: 'staff-1' } })
  })

  it('protects personal/shared views and manager-only layouts', async () => {
    expect(await savedViewAccess.create({ req: request(staff), data: { owner: null } })).toBe(false)
    expect(await savedViewAccess.create({ req: request(staff), data: { owner: 'staff-1' } })).toBe(true)
    expect(await savedViewAccess.create({ req: request(manager), data: { owner: null } })).toBe(true)
    expect(await savedViewAccess.update({ req: request(manager) })).toBe(true)
    expect(await savedViewAccess.update({ req: request(staff) })).toEqual({ owner: { equals: 'staff-1' } })
    expect(await layoutAccess.update({ req: request(staff) })).toBe(false)
    expect(await layoutAccess.update({ req: request(manager) })).toBe(true)
  })

  it('keeps the collection helper fail-closed unless a leaf supplies its access matrix', () => {
    const config = collaborationCollection({ slug: 'example', admin: {}, fields: [] })
    expect(config.access?.read?.({ req: request(staff) })).toBe(false)
  })
})
