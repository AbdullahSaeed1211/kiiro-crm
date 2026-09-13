import { asId, fixedClock, type Id } from '@ops/kernel'
import { can, type StageTrackedRecord, type UnitOfWork, type Workflow } from '@ops/platform'
import type { CrmDeps, CrmRepository } from '../src/ports/repository'
import type { ContactRecord, CrmDrafts, CrmRecordType, CrmRecords, DealRecord, LeadRecord } from '../src/ports/records'
import type { LookupRecord } from '../src/ports/records'

const leadWorkflow: Workflow = {
  id: asId('workflow-lead'),
  recordType: 'lead',
  name: 'Lead pipeline',
  defaultStageId: asId('lead-open'),
  stages: [
    { id: asId('lead-open'), name: 'Open', category: 'open', color: 'blue', position: 0 },
    { id: asId('lead-won'), name: 'Converted', category: 'done_success', color: 'green', position: 1 },
    { id: asId('lead-lost'), name: 'Lost', category: 'done_failure', color: 'red', position: 2 },
  ],
}

export const dealWorkflow: Workflow = {
  id: asId('workflow-deal'),
  recordType: 'deal',
  name: 'Deal pipeline',
  defaultStageId: asId('deal-open'),
  stages: [
    { id: asId('deal-open'), name: 'Open', category: 'open', color: 'blue', position: 0 },
    { id: asId('deal-won'), name: 'Won', category: 'done_success', color: 'green', position: 1 },
    { id: asId('deal-lost'), name: 'Lost', category: 'done_failure', color: 'red', position: 2 },
  ],
}

export const seedLead: LeadRecord & { customData?: Record<string, unknown> } = {
  id: asId('lead-1'),
  title: 'Acme website',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phone: null,
  companyName: 'Acme',
  organizationId: null,
  sourceId: null,
  ownerId: asId('owner-1'),
  assigneeIds: [],
  workflowId: leadWorkflow.id,
  stageId: asId('lead-open'),
  stageEnteredAt: 1_000,
  lostReasonId: null,
  lostNote: null,
  convertedAt: null,
  convertedDealId: null,
  createdAt: 1_000,
  updatedAt: 5_000,
  customData: { budget: 10, sourceNote: 'qualified' },
}

function tracked(type: 'lead' | 'deal', record: LeadRecord | DealRecord): StageTrackedRecord {
  return {
    ref: { type, id: record.id },
    workflowId: record.workflowId,
    stageId: record.stageId,
    stageEnteredAt: record.stageEnteredAt,
    updatedAt: record.updatedAt,
    ...(record.ownerId === null ? {} : { ownerId: record.ownerId }),
    assigneeIds: record.assigneeIds,
  }
}

export class MemoryCrm {
  readonly records: { [T in CrmRecordType]: Map<Id, CrmRecords[T]> } = {
    organization: new Map(),
    contact: new Map(),
    lead: new Map([[seedLead.id, seedLead]]),
    deal: new Map(),
  }
  readonly transitions: unknown[] = []
  readonly activities: unknown[] = []
  readonly fieldDefinitions = [
    { recordType: 'lead', key: 'budget', type: 'number' },
    { recordType: 'lead', key: 'sourceNote', type: 'text' },
    { recordType: 'deal', key: 'budget', type: 'number' },
    { recordType: 'deal', key: 'sourceNote', type: 'number' },
  ]
  failLeadUpdate = false
  private sequence = 1

  get<T extends CrmRecordType>(type: T, id: Id): Promise<CrmRecords[T] | undefined> {
    return Promise.resolve(this.records[type].get(id))
  }

  list<T extends CrmRecordType>(type: T): Promise<readonly CrmRecords[T][]> {
    return Promise.resolve([...this.records[type].values()])
  }

  create<T extends CrmRecordType>(type: T, draft: CrmDrafts[T]): Promise<CrmRecords[T]> {
    const id = asId(`${type}-${String(this.sequence++)}`)
    const created = { ...draft, id, createdAt: 9_000, updatedAt: 9_000 } as CrmRecords[T]
    this.records[type].set(id, created)
    return Promise.resolve(created)
  }

  update(...args: Parameters<CrmRepository['update']>): Promise<CrmRecords[CrmRecordType] | undefined> {
    const [type, id, patch, expectedUpdatedAt] = args
    const current = this.records[type].get(id)
    if (current?.updatedAt !== expectedUpdatedAt) return Promise.resolve(undefined)
    if (type === 'lead' && this.failLeadUpdate) {
      this.failLeadUpdate = false
      return Promise.reject(new Error('injected failure after deal creation'))
    }
    const saved = { ...current, ...patch, updatedAt: current.updatedAt + 1 } as CrmRecords[typeof type]
    this.records[type].set(id, saved as never)
    return Promise.resolve(saved)
  }

  findContactByEmail(email: string): Promise<ContactRecord | undefined> {
    return Promise.resolve(
      [...this.records.contact.values()].find((contact) => contact.email?.toLowerCase() === email.toLowerCase()),
    )
  }

  loadDefaultWorkflow(recordType: 'lead' | 'deal'): Promise<Workflow> {
    return Promise.resolve(recordType === 'lead' ? leadWorkflow : dealWorkflow)
  }

  listLookups(): Promise<readonly LookupRecord[]> {
    return Promise.resolve([{ id: asId('reason-budget'), name: 'Budget' }])
  }

  async loadRecord(ref: { type: string; id: Id }): Promise<StageTrackedRecord | undefined> {
    if (ref.type !== 'lead' && ref.type !== 'deal') return undefined
    const record = await this.get(ref.type, ref.id)
    return record === undefined ? undefined : tracked(ref.type, record)
  }

  loadWorkflow(id: Id): Promise<Workflow | undefined> {
    if (id === leadWorkflow.id) return Promise.resolve(leadWorkflow)
    if (id === dealWorkflow.id) return Promise.resolve(dealWorkflow)
    return Promise.resolve(undefined)
  }

  async saveStage(input: Parameters<CrmRepository['saveStage']>[0]): Promise<StageTrackedRecord | undefined> {
    if (input.ref.type !== 'lead' && input.ref.type !== 'deal') return undefined
    const current = await this.get(input.ref.type, input.ref.id)
    if (current?.updatedAt !== input.expectedUpdatedAt) return undefined
    const saved = {
      ...current,
      stageId: input.stageId,
      stageEnteredAt: input.stageEnteredAt,
      updatedAt: current.updatedAt + 1,
    }
    this.records[input.ref.type].set(input.ref.id, saved as never)
    return tracked(input.ref.type, saved)
  }

  addTransition(transition: unknown): Promise<void> {
    this.transitions.push(transition)
    return Promise.resolve()
  }

  addActivity(entry: unknown): Promise<void> {
    this.activities.push(entry)
    return Promise.resolve()
  }
}

export function makeDeps(
  repository = new MemoryCrm(),
  role: 'owner' | 'manager' | 'staff' = 'owner',
): CrmDeps & { repo: MemoryCrm } {
  const actorId = role === 'staff' ? asId('staff-1') : asId('owner-1')
  const unit: UnitOfWork = { run: (work) => work() }
  return {
    actor: { id: actorId, role, groupIds: [], reportIds: [], active: true },
    can,
    repo: repository as unknown as CrmRepository,
    uow: unit,
    clock: fixedClock(10_000),
  } as unknown as CrmDeps & { repo: MemoryCrm }
}

export const convertInput = {
  leadId: 'lead-1',
  expectedUpdatedAt: 5_000,
  organization: { create: { name: 'Acme' } },
  contact: { create: true },
  deal: {},
}
