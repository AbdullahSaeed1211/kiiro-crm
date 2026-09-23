import { describe, expect, it } from 'vitest'
import { createDealSchema, createLeadSchema, markLostSchema, updateDealSchema } from '../src/schema'

describe('CRM epoch schemas', () => {
  it('reject negative expected close dates on create and update', () => {
    expect(createDealSchema.safeParse({ title: 'Deal', expectedCloseAt: -1 }).success).toBe(false)
    expect(
      updateDealSchema.safeParse({ id: 'deal-1', expectedUpdatedAt: 0, patch: { expectedCloseAt: -1 } }).success,
    ).toBe(false)
  })

  it('rejects negative command versions', () => {
    expect(markLostSchema.safeParse({ id: 'deal-1', expectedUpdatedAt: -1, lostReasonId: 'reason-1' }).success).toBe(
      false,
    )
  })
})

describe('optional CRM form fields', () => {
  it('normalizes blank optional email and relationship fields from forms', () => {
    expect(createLeadSchema.parse({ title: 'A lead', email: '', sourceId: '', ownerId: '' })).toMatchObject({
      title: 'A lead',
      email: null,
      sourceId: null,
      ownerId: null,
      assigneeIds: [],
    })
  })
})
