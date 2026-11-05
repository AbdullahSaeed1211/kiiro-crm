import { describe, expect, it } from 'vitest'
import { mergeTerminology, termsFromTemplate } from '../../src/server/actions/settings/terminology'

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

// The vertical templates named terms in the singular under keys the navigation never read, so "Engagement" never showed.
describe('termsFromTemplate', () => {
  it('turns template words into the plural keys the navigation reads', () => {
    expect(termsFromTemplate({ deal: 'Engagement', contact: 'Client', organization: 'Firm client' })).toEqual({
      deals: 'Engagements',
      contacts: 'Clients',
      organizations: 'Firm clients',
    })
  })

  it('leaves a key it does not know as it is', () => {
    expect(termsFromTemplate({ clientsGroup: 'Matters' })).toEqual({ clientsGroup: 'Matters' })
  })
})
