import { describe, expect, it } from 'vitest'
import { organizationData } from '../../seed/build'
import { CONTACTS, DEALS, LEADS, ORGANIZATIONS, SOURCES } from '../../seed/crm-data'
import { USERS } from '../../seed/data'

const ids = (keys: readonly string[]): Map<string, string> => new Map(keys.map((key) => [key, `id-${key}`]))
describe('CRM seed data', () => {
  it('keeps CRM lookup choices and pipelines without fabricating client records', () => {
    expect(SOURCES).toEqual(['Website form', 'Referral', 'Ads', 'Social', 'Email', 'Phone/walk-in'])
    expect(LEADS).toEqual([])
    expect(DEALS).toEqual([])
    expect(CONTACTS).toEqual([])
  })

  it('keeps seed keys and titles, emails, and contacts unique', () => {
    expect(new Set(ORGANIZATIONS.map((item) => item.key)).size).toBe(ORGANIZATIONS.length)
    expect(new Set(CONTACTS.map((item) => item.email)).size).toBe(CONTACTS.length)
    expect(new Set(LEADS.map((item) => item.title)).size).toBe(LEADS.length)
    expect(new Set(DEALS.map((item) => item.title)).size).toBe(DEALS.length)
    expect(ORGANIZATIONS.map((item) => item.name)).toEqual([
      'Austin Optics',
      'ETCPA',
      'Shapiro Law Office',
      'Shapiro The Hero',
      'AGR Gold',
      'Fast Track',
      'PBNJ (property Buyer New Jersey)',
      'Green Vision',
      'Mirch Media',
      'Baller Squad',
    ])
  })

  it('keeps Baller Squad limited to its verified public website', () => {
    expect(ORGANIZATIONS.find((item) => item.key === 'baller-squad')).toMatchObject({
      website: 'https://www.ballersquad.com',
      phone: '',
      email: '',
    })
  })

  it('keeps ETCPA contact details aligned with its official contact page', () => {
    expect(ORGANIZATIONS.find((item) => item.key === 'etcpa')).toMatchObject({
      website: 'https://www.etcpa.com',
      phone: '+1 718-261-9600',
      email: 'file@etcpa.com',
    })
  })
})

describe('CRM seed builders', () => {
  const users = ids(USERS.map((user) => user.key))
  const sources = ids(SOURCES)

  it('links each supplied organization to the account owner without invented sources', () => {
    const organization = ORGANIZATIONS.at(1)
    if (organization === undefined) throw new Error('missing organization seed')
    expect(organizationData(organization, users, sources)).toMatchObject({
      owner: 'id-owner',
      source: null,
      customData: {},
    })
  })
})
