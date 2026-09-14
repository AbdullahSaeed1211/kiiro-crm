import type { UserKey } from './data'

export type Service = 'Website' | 'SEO' | 'Social media' | 'Design' | 'App development' | 'Ads'
export type Budget = 'Under $1k' | '$1k–5k' | '$5k–20k' | '$20k+'

export interface OrganizationSeed {
  readonly key: string
  readonly name: string
  readonly website: string
  readonly phone: string
  readonly email: string
  readonly source?: string
}

export interface ContactSeed {
  readonly key: string
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone: string
  readonly organization: string
}

export interface LeadSeed {
  readonly key: string
  readonly title: string
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone: string
  readonly companyName: string
  readonly organization: string
  readonly source: string
  readonly owner: UserKey
  readonly assignees: readonly UserKey[]
  readonly stage: string
  readonly service: Service
  readonly budget: Budget
  readonly lostReason?: string
  readonly lostNote?: string
}

export interface DealSeed {
  readonly key: string
  readonly title: string
  readonly organization: string
  readonly contacts: readonly string[]
  readonly primaryContact: string
  readonly valueAmountMinor: number
  readonly expectedCloseDay: number
  readonly stage: string
  readonly owner: UserKey
  readonly assignees: readonly UserKey[]
  readonly serviceLines: readonly Service[]
  readonly sourceLead?: string
  readonly lostReason?: string
  readonly lostNote?: string
}
