import { describe, expect, it } from 'vitest'
import {
  automationRulesSchema,
  matchesConditions,
  planFor,
  runKey,
  type AutomationRule,
  type RuleCandidate,
} from '../src/domain/rules'

const SOURCE_ID = 'source-web'

const candidate = (overrides: Partial<RuleCandidate> = {}): RuleCandidate => ({
  record: { type: 'lead', id: 'lead-1' },
  trigger: 'lead.created',
  triggerKey: 'created:1762300800000',
  sourceId: SOURCE_ID,
  ownerId: 'user-1',
  stageId: 'stage-new',
  valueMinor: 500,
  ...overrides,
})

const rule = (overrides: Partial<AutomationRule> = {}): AutomationRule => ({
  id: 'rule-1',
  name: 'Welcome new leads',
  enabled: true,
  createdById: 'owner-1',
  trigger: { kind: 'lead.created' },
  conditions: [],
  actions: [{ kind: 'notify', userId: 'owner-1' }],
  ...overrides,
})

const firstIssue = (input: unknown): string | undefined => {
  const parsed = automationRulesSchema.safeParse(input)
  return parsed.success ? undefined : parsed.error.issues[0]?.message
}

describe('automationRulesSchema', () => {
  it('accepts a rule with a no-reply trigger, conditions and actions', () => {
    const parsed = automationRulesSchema.safeParse([
      rule({
        trigger: { kind: 'lead.no_reply', days: 3 },
        conditions: [{ field: 'source', op: 'is', value: SOURCE_ID }],
        actions: [
          { kind: 'create_task', title: 'Call the lead', dueInDays: 1, assignee: 'record_owner' },
          { kind: 'assign_owner', userId: 'user-1' },
        ],
      }),
    ])
    expect(parsed.success).toBe(true)
  })

  it('requires days for a no-reply trigger and a value-only field for gte', () => {
    expect(firstIssue([rule({ trigger: { kind: 'lead.no_reply', days: 0 } })])).toBeDefined()
    expect(firstIssue([rule({ conditions: [{ field: 'owner', op: 'gte', value: 10 }] })])).toBe(
      'Only value conditions can use gte or lte.',
    )
  })

  it('rejects a rule with no actions and more than twenty rules', () => {
    expect(firstIssue([rule({ actions: [] })])).toBeDefined()
    expect(firstIssue(Array.from({ length: 21 }, (_, index) => rule({ id: `rule-${String(index)}` })))).toBeDefined()
  })
})

describe('matchesConditions', () => {
  it('matches an empty condition list and each text comparison', () => {
    expect(matchesConditions(rule(), candidate())).toBe(true)
    expect(
      matchesConditions(rule({ conditions: [{ field: 'source', op: 'is', value: SOURCE_ID }] }), candidate()),
    ).toBe(true)
    expect(
      matchesConditions(rule({ conditions: [{ field: 'owner', op: 'is_not', value: 'user-2' }] }), candidate()),
    ).toBe(true)
  })

  it('never matches a missing fact, even with is_not', () => {
    const missing = candidate({ sourceId: null })
    expect(matchesConditions(rule({ conditions: [{ field: 'source', op: 'is_not', value: 'x' }] }), missing)).toBe(
      false,
    )
  })

  it('compares the numeric value with gte and lte', () => {
    expect(matchesConditions(rule({ conditions: [{ field: 'value', op: 'gte', value: 500 }] }), candidate())).toBe(true)
    expect(matchesConditions(rule({ conditions: [{ field: 'value', op: 'lte', value: 499 }] }), candidate())).toBe(
      false,
    )
  })
})

describe('planFor and runKey', () => {
  it('plans only candidates of the rule trigger whose conditions match', () => {
    const candidates = [candidate(), candidate({ trigger: 'deal.won' }), candidate({ sourceId: 'other' })]
    const planned = planFor(rule({ conditions: [{ field: 'source', op: 'is', value: SOURCE_ID }] }), candidates)
    expect(planned).toHaveLength(1)
  })

  it('identifies a run by rule, record and trigger time', () => {
    const first = runKey(rule(), candidate())
    expect(first).toBe('rule-1|lead|lead-1|created:1762300800000')
    expect(runKey(rule(), candidate({ triggerKey: 'created:1762300800001' }))).not.toBe(first)
    expect(runKey(rule({ id: 'rule-2' }), candidate())).not.toBe(first)
  })
})
