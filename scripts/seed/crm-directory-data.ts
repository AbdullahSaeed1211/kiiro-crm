import type { ContactSeed, OrganizationSeed } from './crm-types'

export const ORGANIZATIONS: readonly OrganizationSeed[] = [
  ...(
    [
      ['austin-optics', 'Austin Optics', 'https://austinoptics.com', '+1 718-261-8655', ''],
      ['etcpa', 'ETCPA', 'https://www.etcpa.com', '+1 718-261-9600', 'file@etcpa.com'],
      ['shapiro-law-office', 'Shapiro Law Office', 'https://www.shapirolawoffice.com', '+1 718-261-8500', ''],
      ['shapiro-the-hero', 'Shapiro The Hero', 'https://shapirothehero.com', '+1 970-742-7476', ''],
      ['agr-gold', 'AGR Gold', 'https://agrgold.com', '+1 212-391-1012', 'customerservice@agrgold.com'],
      ['fast-track', 'Fast Track', 'https://fasttracktlg.com', '+1 718-366-8000', 'info@fasttracktlg.com'],
      [
        'pbnj',
        'PBNJ (property Buyer New Jersey)',
        'https://www.propertybuyernj.com',
        '+1 917-856-1612',
        '',
        'Property Buyer New Jersey',
      ],
      ['green-vision', 'Green Vision', 'https://greenvision.eco', '', 'contact@greenvision.eco'],
      ['mirch-media', 'Mirch Media', 'https://www.mirchmedia.com', '+1 516-969-8550', ''],
      ['baller-squad', 'Baller Squad', 'https://www.ballersquad.com', '', ''],
    ] as const
  ).map(([key, name, website, phone, email, previousName]) => ({
    key,
    name,
    website,
    phone,
    email,
    ...(previousName === undefined ? {} : { previousName }),
  })),
]

export const CONTACTS: readonly ContactSeed[] = []
