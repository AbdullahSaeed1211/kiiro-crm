import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { archiveRecord } from '../src/commands/archive'
import { makeDeps, MemoryCrm, seedLead } from './memory-crm'

function ownedLead() {
  const repo = new MemoryCrm()
  const lead = { ...seedLead, id: asId('lead-own'), ownerId: asId('staff-1') }
  repo.records.lead.set(lead.id, lead)
  return { repo, lead }
}

// A permission rule no success response shows: staff own leads but must not be able to remove them.
describe('archiveRecord', () => {
  it('refuses staff and keeps the record', async () => {
    const { repo, lead } = ownedLead()
    const result = await archiveRecord(makeDeps(repo, 'staff'), { type: 'lead', id: lead.id })
    expect(result.ok ? undefined : result.error.code).toBe('FORBIDDEN')
    expect(repo.records.lead.has(lead.id)).toBe(true)
  })

  it('lets a manager archive it', async () => {
    const { repo, lead } = ownedLead()
    const result = await archiveRecord(makeDeps(repo, 'manager'), { type: 'lead', id: lead.id })
    expect(result.ok).toBe(true)
    expect(repo.records.lead.has(lead.id)).toBe(false)
  })
})
