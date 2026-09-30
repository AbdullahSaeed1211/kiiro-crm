import { z } from 'zod'

const MAX_RULES = 10
const MAX_OWNERS = 20

/** One rule: leads (optionally only from one source) are handed to these people in turn. */
export const leadRulesSchema = z
  .array(
    z
      .object({
        id: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(80),
        sourceId: z.string().trim().min(1).nullable(),
        ownerIds: z.array(z.string().trim().min(1)).min(1).max(MAX_OWNERS),
      })
      .strict(),
  )
  .max(MAX_RULES)

export type LeadRule = z.infer<typeof leadRulesSchema>[number]

/** The first rule that matches a lead's source, preferring a rule for that exact source over the catch-all. */
export function ruleFor(rules: readonly LeadRule[], sourceId: string | null): LeadRule | undefined {
  return (
    rules.find((rule) => rule.sourceId !== null && rule.sourceId === sourceId) ??
    rules.find((rule) => rule.sourceId === null)
  )
}

/** The owner for the next lead: a rule's people in rotation, given how many leads already came in. */
export function nextOwner(rule: LeadRule, leadsSoFar: number): string {
  return rule.ownerIds[leadsSoFar % rule.ownerIds.length] ?? ''
}

const HOUR_MS = 60 * 60 * 1000

/** Whether a lead has waited past the first-response target without leaving its first stage; a target of 0 is off. */
export function responseOverdue(input: {
  readonly createdAt: number
  readonly now: number
  readonly targetHours: number
  readonly inFirstStage: boolean
}): boolean {
  return input.targetHours > 0 && input.inFirstStage && input.now - input.createdAt > input.targetHours * HOUR_MS
}
