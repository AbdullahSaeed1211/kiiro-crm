import type { RuleCandidate, TriggerKind } from '@ops/module-automation'
import type { Payload } from 'payload'
import { DAY_MS, idOf, READ_LIMIT, textOf, warnTruncated, type CandidateWindow } from './candidate-common'

type DealTrigger = Extract<TriggerKind, 'deal.stage_changed' | 'deal.won' | 'deal.lost'>

/** Stage categories that mean a deal was won or lost. */
const WON_CATEGORY = 'done_success'
const LOST_CATEGORY = 'done_failure'

/** The category a trigger needs, or null when every stage change counts. */
function wantedCategory(trigger: DealTrigger): string | null {
  if (trigger === 'deal.won') return WON_CATEGORY
  if (trigger === 'deal.lost') return LOST_CATEGORY
  return null
}

/** Reads the deals one page of transitions names, keyed by id. */
async function dealsById(payload: Payload, ids: readonly string[]): Promise<ReadonlyMap<string, object>> {
  if (ids.length === 0) return new Map()
  const found = await payload.find({
    collection: 'deals',
    where: { id: { in: [...new Set(ids)] } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return new Map(
    found.docs.flatMap((doc) => {
      const id = idOf(Reflect.get(doc, 'id'))
      return id === null ? [] : [[id, doc] as const]
    }),
  )
}

function transitionCandidate(
  transition: object,
  deal: object | undefined,
  trigger: DealTrigger,
): RuleCandidate | undefined {
  const transitionId = idOf(Reflect.get(transition, 'id'))
  const dealId = idOf(Reflect.get(transition, 'recordId'))
  if (transitionId === null || dealId === null || deal === undefined) return undefined
  const value: unknown = Reflect.get(deal, 'valueAmountMinor')
  return {
    record: { type: 'deal', id: dealId },
    trigger,
    triggerKey: `transition:${transitionId}`,
    ownerId: idOf(Reflect.get(deal, 'owner')),
    stageId: textOf(Reflect.get(transition, 'toStageId')),
    valueMinor: typeof value === 'number' && Number.isFinite(value) ? value : null,
  }
}

/** Deal stage changes in the last day before the window ends, narrowed to won or lost when the trigger asks. */
export async function dealTransitionCandidates(
  payload: Payload,
  window: CandidateWindow,
  trigger: DealTrigger,
): Promise<readonly RuleCandidate[]> {
  const found = await payload.find({
    collection: 'stageTransitions',
    where: {
      and: [
        { recordType: { equals: 'deal' } },
        { changedAt: { greater_than_equal: window.start - DAY_MS } },
        { changedAt: { less_than: window.end } },
      ],
    },
    sort: 'changedAt',
    limit: READ_LIMIT,
    depth: 0,
    overrideAccess: true,
  })
  warnTruncated(trigger, found.docs.length)
  const category = wantedCategory(trigger)
  const transitions = found.docs.filter(
    (transition) => category === null || textOf(Reflect.get(transition, 'toCategory')) === category,
  )
  const deals = await dealsById(
    payload,
    transitions.flatMap((transition) => idOf(Reflect.get(transition, 'recordId')) ?? []),
  )
  return transitions.flatMap((transition) => {
    const dealId = idOf(Reflect.get(transition, 'recordId'))
    const deal = dealId === null ? undefined : deals.get(dealId)
    const candidate = transitionCandidate(transition, deal, trigger)
    return candidate === undefined ? [] : [candidate]
  })
}
