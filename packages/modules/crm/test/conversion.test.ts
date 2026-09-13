import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { convertLead } from '../src/commands'
import type { ContactRecord } from '../src/ports/records'
import { convertInput, makeDeps, MemoryCrm, seedLead } from './memory-crm'

describe('CRM conversion basics', () => {
  it('T-CRM-1 creates/links organization, contact and deal and marks the lead', async () => {
    const context = makeDeps()
    const result = await convertLead(context, convertInput)
    expect(result.ok).toBe(true)
    expect(await context.repo.list('organization')).toHaveLength(1)
    expect(await context.repo.list('contact')).toHaveLength(1)
    const deals = await context.repo.list('deal')
    expect(deals).toHaveLength(1)
    expect(deals[0]?.sourceLeadId).toBe(seedLead.id)
    expect((await context.repo.get('lead', seedLead.id))?.convertedDealId).toBe(deals[0]?.id)
  })

  it('T-CRM-2 returns ALREADY_DONE on a second conversion', async () => {
    const context = makeDeps()
    expect((await convertLead(context, convertInput)).ok).toBe(true)
    expect(await convertLead(context, convertInput)).toMatchObject({ ok: false, error: { code: 'ALREADY_DONE' } })
  })

  it('T-CRM-3 deduplicates a new contact by email', async () => {
    const context = makeDeps()
    const existing: ContactRecord = {
      id: asId('contact-existing'),
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
      phone: null,
      organizationId: null,
      ownerId: asId('owner-1'),
      customData: {},
      createdAt: 1,
      updatedAt: 1,
    }
    context.repo.records.contact.set(existing.id, existing)
    expect((await convertLead(context, convertInput)).ok).toBe(true)
    expect(await context.repo.list('contact')).toHaveLength(1)
    expect((await context.repo.list('deal'))[0]?.primaryContactId).toBe(existing.id)
  })
})

describe('CRM custom conversion fields', () => {
  it('T-CRM-4 copies only same-typed custom fields to the deal', async () => {
    const context = makeDeps()
    expect((await convertLead(context, convertInput)).ok).toBe(true)
    const [deal] = await context.repo.list('deal')
    expect(deal?.customData).toEqual({ budget: 10 })
  })
})

describe('CRM conversion recovery', () => {
  it('T-CRM-7 retries an ordered conversion after a failure during lead update', async () => {
    const repository = new MemoryCrm()
    const context = makeDeps(repository)
    repository.failLeadUpdate = true
    expect(await convertLead(context, convertInput)).toMatchObject({ ok: false, error: { code: 'INTERNAL' } })
    expect(await repository.list('deal')).toHaveLength(1)
    expect((await convertLead(context, convertInput)).ok).toBe(true)
    expect(await repository.list('deal')).toHaveLength(1)
  })
})
