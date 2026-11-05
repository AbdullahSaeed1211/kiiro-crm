import type { AutomationRule, RuleCandidate } from '@ops/module-automation'
import type { Payload } from 'payload'
import type { CandidateWindow } from './candidate-common'
import { dealTransitionCandidates } from './candidate-deals'
import { leadCreatedCandidates, leadNoReplyCandidates } from './candidate-leads'
import { taskOverdueCandidates } from './candidate-tasks'

/** Builds the candidates one rule's trigger sees; only the records a rule may act on are read. */
export async function candidatesForRule(input: {
  readonly payload: Payload
  readonly rule: AutomationRule
  readonly window: CandidateWindow
  readonly timeZone: string
}): Promise<readonly RuleCandidate[]> {
  const trigger = input.rule.trigger
  switch (trigger.kind) {
    case 'lead.created':
      return leadCreatedCandidates(input.payload, input.window)
    case 'lead.no_reply':
      return leadNoReplyCandidates(input.payload, input.window, trigger.days)
    case 'deal.stage_changed':
    case 'deal.won':
    case 'deal.lost':
      return dealTransitionCandidates(input.payload, input.window, trigger.kind)
    case 'task.overdue':
      return taskOverdueCandidates(input.payload, input.window, input.timeZone)
  }
}
