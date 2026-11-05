import { automationRulesSchema, planFor, runKey, type AutomationRule, type RuleCandidate } from '@ops/module-automation'
import { COLLECTIONS, SETTINGS_GLOBAL } from '@ops/adapter-payload'
import type { Payload } from 'payload'
import { runAction, type ActionOutcome } from './actions'
import { candidatesForRule } from './candidates'
import type { CandidateWindow } from './candidate-common'

export interface AutomationRunSummary {
  readonly processed: number
  readonly created: number
  readonly skipped: number
}

export interface RunInput {
  readonly payload: Payload
  readonly window: CandidateWindow
  readonly timeZone: string
}

interface CandidateStep {
  readonly payload: Payload
  readonly rule: AutomationRule
  readonly candidate: RuleCandidate
  readonly windowEnd: number
}

function isUniqueFailure(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    if (/unique/i.test(current.message)) return true
    current = current.cause
  }
  return false
}

/** Creates the run row; a unique-key failure means another pass already claimed it. */
async function claimRun(input: CandidateStep & { readonly key: string }): Promise<string | null> {
  try {
    const row = await input.payload.create({
      collection: COLLECTIONS.ruleRuns,
      data: {
        key: input.key,
        ruleId: input.rule.id,
        ruleName: input.rule.name,
        recordType: input.candidate.record.type,
        recordId: input.candidate.record.id,
        trigger: input.rule.trigger.kind,
        status: 'running',
        startedAt: Date.now(),
      },
      overrideAccess: true,
    })
    return row.id
  } catch (error) {
    if (isUniqueFailure(error)) return null
    throw error
  }
}

/** Runs every action in order, then closes the claim with what each one did. */
async function executeClaim(input: CandidateStep & { readonly key: string; readonly rowId: string }): Promise<void> {
  const outcomes: ActionOutcome[] = []
  for (const action of input.rule.actions) {
    outcomes.push(
      await runAction({
        payload: input.payload,
        rule: input.rule,
        candidate: input.candidate,
        action,
        key: input.key,
        windowEnd: input.windowEnd,
      }),
    )
  }
  const failed = outcomes.find((outcome) => !outcome.ok)
  await input.payload.update({
    collection: COLLECTIONS.ruleRuns,
    id: input.rowId,
    data: {
      status: failed === undefined ? 'done' : 'failed',
      finishedAt: Date.now(),
      actions: outcomes,
      error: failed?.detail ?? null,
    },
    overrideAccess: true,
  })
}

async function processCandidate(input: CandidateStep): Promise<boolean> {
  const key = runKey(input.rule, input.candidate)
  const rowId = await claimRun({ ...input, key })
  if (rowId === null) return false
  await executeClaim({ ...input, key, rowId })
  return true
}

async function processRule(input: {
  readonly payload: Payload
  readonly rule: AutomationRule
  readonly candidates: readonly RuleCandidate[]
  readonly windowEnd: number
}): Promise<AutomationRunSummary> {
  let created = 0
  let skipped = 0
  for (const candidate of input.candidates) {
    const claimed = await processCandidate({
      payload: input.payload,
      rule: input.rule,
      candidate,
      windowEnd: input.windowEnd,
    })
    if (claimed) created += 1
    else skipped += 1
  }
  return { processed: input.candidates.length, created, skipped }
}

async function loadEnabledRules(payload: Payload): Promise<AutomationRule[]> {
  const settings = await payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true })
  const parsed = automationRulesSchema.safeParse(Reflect.get(settings, 'automationRules') ?? [])
  return parsed.success ? parsed.data.filter((rule) => rule.enabled) : []
}

/** One read per trigger shape per run; rules that share a trigger see the same candidates. */
async function candidatesCached(
  cache: Map<string, readonly RuleCandidate[]>,
  input: RunInput,
  rule: AutomationRule,
): Promise<readonly RuleCandidate[]> {
  const cacheKey = JSON.stringify(rule.trigger)
  const cached = cache.get(cacheKey)
  if (cached !== undefined) return cached
  const candidates = await candidatesForRule({
    payload: input.payload,
    rule,
    window: input.window,
    timeZone: input.timeZone,
  })
  cache.set(cacheKey, candidates)
  return candidates
}

/**
 * Evaluates the enabled workspace rules for one cron window. This is cron-only: actions never evaluate rules in turn,
 * so there is no synchronous loop. Each (rule, record, trigger time) is claimed on `ruleRuns` before its actions run.
 */
export async function runAutomationRules(input: RunInput): Promise<AutomationRunSummary> {
  const rules = await loadEnabledRules(input.payload)
  const cache = new Map<string, readonly RuleCandidate[]>()
  let processed = 0
  let created = 0
  let skipped = 0
  for (const rule of rules) {
    const candidates = await candidatesCached(cache, input, rule)
    const summary = await processRule({
      payload: input.payload,
      rule,
      candidates: planFor(rule, candidates),
      windowEnd: input.window.end,
    })
    processed += summary.processed
    created += summary.created
    skipped += summary.skipped
  }
  console.log('[automation.rules] run complete', { rules: rules.length, processed, created, skipped })
  return { processed, created, skipped }
}
