import { describe, expect, it } from 'vitest'
import { mergeTerminology } from '../../src/server/actions/settings/terminology'

// Saving used to replace the whole field, so onboarding progress stored beside the names was lost on every save.
describe('mergeTerminology', () => {
  const stored = {
    __onboarding: { currentStep: 3 },
    clientsGroup: 'Accounts',
    organization: 'Account',
    leads: 'Prospects',
  }

  it('keeps what is stored beside the names and drops the old singular keys', () => {
    const result = mergeTerminology(stored, { organizations: 'Accounts', leads: 'Prospects' })
    expect(result).toEqual({
      value: {
        __onboarding: { currentStep: 3 },
        clientsGroup: 'Accounts',
        organizations: 'Accounts',
        leads: 'Prospects',
      },
    })
  })

  it('clears a term that is left empty so the default shows again', () => {
    const result = mergeTerminology(stored, { leads: '  ', tasks: 'Jobs' })
    expect(result).toEqual({ value: { __onboarding: { currentStep: 3 }, clientsGroup: 'Accounts', tasks: 'Jobs' } })
  })

  it('refuses a name that is too long and changes nothing', () => {
    expect(mergeTerminology(stored, { tasks: 'x'.repeat(41) })).toHaveProperty('error')
  })
})
