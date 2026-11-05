import type { RuleCandidate } from '@ops/module-automation'
import type { Payload } from 'payload'
import { DAY_MS, idOf, iso, msOf, READ_LIMIT, textOf, warnTruncated, type CandidateWindow } from './candidate-common'

function leadCandidate(doc: object, trigger: 'lead.created' | 'lead.no_reply', triggerKey: string): RuleCandidate[] {
  const id = idOf(Reflect.get(doc, 'id'))
  if (id === null) return []
  return [
    {
      record: { type: 'lead', id },
      trigger,
      triggerKey,
      sourceId: idOf(Reflect.get(doc, 'source')),
      ownerId: idOf(Reflect.get(doc, 'owner')),
      stageId: textOf(Reflect.get(doc, 'stageId')),
      valueMinor: null,
    },
  ]
}

/** Leads created in the last day before the window ends. */
export async function leadCreatedCandidates(
  payload: Payload,
  window: CandidateWindow,
): Promise<readonly RuleCandidate[]> {
  const found = await payload.find({
    collection: 'leads',
    where: {
      and: [
        { createdAt: { greater_than_equal: iso(window.start - DAY_MS) } },
        { createdAt: { less_than: iso(window.end) } },
      ],
    },
    sort: 'createdAt',
    limit: READ_LIMIT,
    depth: 0,
    overrideAccess: true,
  })
  warnTruncated('lead.created', found.docs.length)
  return found.docs.flatMap((doc) => {
    const createdAt = msOf(Reflect.get(doc, 'createdAt'))
    return createdAt === null ? [] : leadCandidate(doc, 'lead.created', `created:${String(createdAt)}`)
  })
}

/** The lowest-position open stage of each lead workflow; a lead still there has had no reply. */
async function firstOpenLeadStageIds(payload: Payload): Promise<string[]> {
  const found = await payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'lead' } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const ids: string[] = []
  for (const workflow of found.docs) {
    const stages = Array.isArray(workflow.stages) ? workflow.stages : []
    const first = stages
      .filter((stage) => stage.category === 'open')
      .toSorted((left, right) => left.position - right.position)
      .at(0)
    const id = first === undefined ? null : idOf(first.id)
    if (id !== null) ids.push(id)
  }
  return ids
}

/** Leads older than `days` that are still in their workflow's first open stage. */
export async function leadNoReplyCandidates(
  payload: Payload,
  window: CandidateWindow,
  days: number,
): Promise<readonly RuleCandidate[]> {
  const stageIds = await firstOpenLeadStageIds(payload)
  if (stageIds.length === 0) return []
  const found = await payload.find({
    collection: 'leads',
    where: {
      and: [{ createdAt: { less_than_equal: iso(window.end - days * DAY_MS) } }, { stageId: { in: stageIds } }],
    },
    sort: 'createdAt',
    limit: READ_LIMIT,
    depth: 0,
    overrideAccess: true,
  })
  warnTruncated('lead.no_reply', found.docs.length)
  return found.docs.flatMap((doc) => leadCandidate(doc, 'lead.no_reply', `no_reply:${String(days)}`))
}
