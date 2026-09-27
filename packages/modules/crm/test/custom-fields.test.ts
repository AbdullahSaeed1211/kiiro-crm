import { asId } from '@ops/kernel'
import type { FieldDefinition } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { setCustomFields } from '../src/commands/custom-fields'
import { makeDeps, MemoryCrm, seedLead } from './memory-crm'

const field = (key: string, visibility: FieldDefinition['visibility']): FieldDefinition => ({
  key,
  label: key,
  type: key === 'fee' ? 'currency' : 'text',
  required: false,
  options: [],
  visibility,
  sensitive: false,
  hidden: false,
  position: 0,
})

function staffLead() {
  const repo = new MemoryCrm()
  const lead = { ...seedLead, id: asId('lead-staff'), ownerId: asId('staff-1'), customData: { fee: 100 } }
  repo.records.lead.set(lead.id, lead)
  repo.customFields = [field('note', 'all'), field('fee', 'manager_up')]
  return { deps: makeDeps(repo, 'staff'), lead }
}

// A permission rule no response shows on success: staff must neither write nor wipe manager-only values.
describe('setCustomFields for staff', () => {
  it('rejects a manager-only field', async () => {
    const { deps, lead } = staffLead()
    const input = { type: 'lead', id: lead.id, expectedUpdatedAt: lead.updatedAt, values: { fee: 1 } }
    const result = await setCustomFields(deps, input)
    expect(result.ok).toBe(false)
    expect(result.ok ? undefined : result.error.details?.['fields']).toHaveProperty('fee')
  })

  it('keeps manager-only values when saving visible ones', async () => {
    const { deps, lead } = staffLead()
    const input = { type: 'lead', id: lead.id, expectedUpdatedAt: lead.updatedAt, values: { note: 'Kickoff done' } }
    const result = await setCustomFields(deps, input)
    expect(result.ok && result.value.customData).toEqual({ fee: 100, note: 'Kickoff done' })
  })
})
