import type { ContactSeed, OrganizationSeed } from './crm-types'

/** Fictional clients of the demo agency; every domain is reserved for examples and every number is unassigned. */
export const ORGANIZATIONS: readonly OrganizationSeed[] = [
  ...(
    [
      ['northwind-optics', 'Northwind Optics', 'https://northwindoptics.example.test', '+1 555-0100-01', ''],
      [
        'harbor-cpa',
        'Harbor CPA',
        'https://www.harborcpa.example.test',
        '+1 555-0100-02',
        'file@harborcpa.example.test',
      ],
      ['lakeside-law-office', 'Lakeside Law Office', 'https://www.lakesidelaw.example.test', '+1 555-0100-03', ''],
      ['lakeside-champion', 'Lakeside Champion', 'https://lakesidechampion.example.test', '+1 555-0100-04', ''],
      [
        'sterling-jewelers',
        'Sterling Jewelers',
        'https://sterlingjewelers.example.test',
        '+1 555-0100-05',
        'hello@sterlingjewelers.example.test',
      ],
      [
        'summit-logistics',
        'Summit Logistics',
        'https://summitlogistics.example.test',
        '+1 555-0100-06',
        'info@summitlogistics.example.test',
      ],
      ['keystone-homes', 'Keystone Homes', 'https://www.keystonehomes.example.test', '+1 555-0100-07', ''],
      [
        'evergreen-solar',
        'Evergreen Solar',
        'https://evergreensolar.example.test',
        '',
        'contact@evergreensolar.example.test',
      ],
      ['demo-agency', 'Demo Agency', 'https://www.demoagency.example.test', '+1 555-0100-08', ''],
      ['court-kings', 'Court Kings', 'https://www.courtkings.example.test', '', ''],
    ] as const
  ).map(([key, name, website, phone, email]) => ({ key, name, website, phone, email })),
]

export const CONTACTS: readonly ContactSeed[] = [
  {
    key: 'homes-owner',
    firstName: 'Grace',
    lastName: 'Nolan',
    email: 'grace.nolan@keystonehomes.example.test',
    phone: '+1 555-0102-01',
    organization: 'keystone-homes',
  },
  {
    key: 'solar-marketing',
    firstName: 'Omar',
    lastName: 'Haddad',
    email: 'omar.haddad@evergreensolar.example.test',
    phone: '+1 555-0102-02',
    organization: 'evergreen-solar',
  },
  {
    key: 'law-partner',
    firstName: 'Ruth',
    lastName: 'Bennett',
    email: 'ruth.bennett@lakesidelaw.example.test',
    phone: '+1 555-0102-03',
    organization: 'lakeside-law-office',
  },
  {
    key: 'kings-manager',
    firstName: 'Tyrone',
    lastName: 'Davis',
    email: 'tyrone.davis@courtkings.example.test',
    phone: '+1 555-0102-04',
    organization: 'court-kings',
  },
]
