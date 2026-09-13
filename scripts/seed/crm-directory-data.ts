import type { ContactSeed, OrganizationSeed } from './crm-data'

const HARBOR_PINE = 'harbor-pine'

export const ORGANIZATIONS: readonly OrganizationSeed[] = [
  {
    key: 'example',
    name: 'Example Organization',
    website: 'https://example.test',
    phone: '+1 212 555 0100',
    email: 'hello@example.test',
  },
  {
    key: 'northstar',
    name: 'Northstar Health Studio',
    website: 'https://northstar.example.test',
    phone: '+1 415 555 0110',
    email: 'hello@northstar.example.test',
    source: 'Referral',
  },
  {
    key: HARBOR_PINE,
    name: 'Harbor & Pine Retail',
    website: 'https://harbor-pine.example.test',
    phone: '+1 617 555 0120',
    email: 'hello@harbor-pine.example.test',
    source: 'Website form',
  },
]

export const CONTACTS: readonly ContactSeed[] = [
  {
    key: 'avery',
    firstName: 'Avery',
    lastName: 'Chen',
    email: 'avery.chen@example.test',
    phone: '+1 212 555 0131',
    organization: 'example',
  },
  {
    key: 'priya',
    firstName: 'Priya',
    lastName: 'Shah',
    email: 'priya.shah@example.test',
    phone: '+1 212 555 0132',
    organization: 'example',
  },
  {
    key: 'marcus',
    firstName: 'Marcus',
    lastName: 'Lee',
    email: 'marcus.lee@example.test',
    phone: '+1 415 555 0133',
    organization: 'northstar',
  },
  {
    key: 'elena',
    firstName: 'Elena',
    lastName: 'Torres',
    email: 'elena.torres@example.test',
    phone: '+1 415 555 0134',
    organization: 'northstar',
  },
  {
    key: 'jon',
    firstName: 'Jon',
    lastName: 'Bell',
    email: 'jon.bell@example.test',
    phone: '+1 617 555 0135',
    organization: HARBOR_PINE,
  },
  {
    key: 'sofia',
    firstName: 'Sofia',
    lastName: 'Grant',
    email: 'sofia.grant@example.test',
    phone: '+1 617 555 0136',
    organization: HARBOR_PINE,
  },
]
