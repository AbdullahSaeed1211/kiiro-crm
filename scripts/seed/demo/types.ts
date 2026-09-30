export interface DemoOrg {
  readonly key: string
  readonly name: string
  readonly vertical: string
  readonly website: string
  readonly phone: string
  readonly email: string
  readonly ownerKey: string
  readonly createdDay: number
}

export interface DemoContact {
  readonly key: string
  readonly orgKey: string
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone: string
  readonly ownerKey: string
  readonly subscribed: boolean
  readonly createdDay: number
}

/** A step of a record's stage history; `day` is when it entered `stage`. */
export interface StageStep {
  readonly stage: string
  readonly day: number
}

export interface DemoLead {
  readonly key: string
  readonly title: string
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone: string
  readonly companyName: string
  readonly orgKey: string | null
  readonly source: string
  readonly ownerKey: string
  readonly path: readonly StageStep[]
  readonly createdDay: number
  readonly nextActionDay: number | null
  readonly service: string
  readonly budget: string
  readonly lostReason: string | null
  readonly dealKey: string | null
}

export interface DemoDeal {
  readonly key: string
  readonly title: string
  readonly orgKey: string
  readonly contactKeys: readonly string[]
  readonly valueMajor: number
  readonly path: readonly StageStep[]
  readonly createdDay: number
  readonly expectedCloseDay: number
  readonly ownerKey: string
  readonly serviceLines: readonly string[]
  readonly leadKey: string | null
  readonly lostReason: string | null
}

export interface DemoProject {
  readonly key: string
  readonly name: string
  readonly orgKey: string
  readonly description: string
  readonly stage: string
  readonly memberKeys: readonly string[]
  readonly startDay: number
  readonly targetEndDay: number
  readonly retainer: boolean
}

export interface DemoTask {
  readonly title: string
  readonly description: string
  readonly projectKey: string
  readonly stage: string
  readonly priority: 'none' | 'low' | 'medium' | 'high' | 'urgent'
  readonly assigneeKeys: readonly string[]
  readonly startDay: number
  readonly dueDay: number
}

export interface DemoNote {
  readonly recordType: 'lead' | 'deal' | 'contact'
  readonly recordKey: string
  readonly authorKey: string
  readonly body: string
  readonly day: number
}

export interface DemoEmail {
  readonly recordType: 'lead' | 'contact' | 'deal'
  readonly recordKey: string
  readonly direction: 'inbound' | 'outbound'
  readonly fromName: string
  readonly fromAddress: string
  readonly toAddress: string
  readonly subject: string
  readonly body: string
  readonly day: number
  readonly id: string
}

/** One sent newsletter: who received it and when. */
export interface DemoCampaign {
  readonly id: string
  readonly subject: string
  readonly body: string
  readonly day: number
  readonly contactKeys: readonly string[]
}

export interface DemoDataset {
  readonly orgs: readonly DemoOrg[]
  readonly contacts: readonly DemoContact[]
  readonly leads: readonly DemoLead[]
  readonly deals: readonly DemoDeal[]
  readonly projects: readonly DemoProject[]
  readonly tasks: readonly DemoTask[]
  readonly notes: readonly DemoNote[]
  readonly emails: readonly DemoEmail[]
  readonly campaigns: readonly DemoCampaign[]
}
