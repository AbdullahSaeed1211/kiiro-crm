import { leadRulesSchema, nextOwner, ruleFor, type LeadRule } from '@ops/module-crm'
import type { CollectionBeforeChangeHook, PayloadRequest, Where } from 'payload'
import { COLLECTIONS, SETTINGS_GLOBAL } from '../contracts/names'

const idOf = (value: unknown): string | null => {
  const id: unknown = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

/** The rule's people who can still take leads: deactivated or deleted users are skipped. */
async function activeOwners(req: PayloadRequest, rule: LeadRule): Promise<LeadRule> {
  const users = await req.payload.find({
    collection: COLLECTIONS.users,
    where: { and: [{ id: { in: [...rule.ownerIds] } }, { active: { equals: true } }] },
    depth: 0,
    limit: rule.ownerIds.length,
    overrideAccess: true,
    req,
  })
  const active = new Set(users.docs.map((user) => String(user.id)))
  return { ...rule, ownerIds: rule.ownerIds.filter((id) => active.has(id)) }
}

/** Leads already counted against a rule, so its people take turns; a source rule counts only that source. */
function leadsUnder(rule: LeadRule): Where {
  return rule.sourceId === null ? {} : { source: { equals: rule.sourceId } }
}

/**
 * Hands a new lead that has no owner to the person its assignment rule names next. It runs for every way a lead is
 * created (the app, the API and website forms), and an owner chosen on the lead always wins.
 */
export const assignNewLead: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  const input = data as Record<string, unknown>
  if (operation !== 'create' || idOf(input['owner']) !== null) return data
  const settings = await req.payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true, req })
  const rules = leadRulesSchema.safeParse(Reflect.get(settings, 'automations') ?? [])
  const matched = rules.success ? ruleFor(rules.data, idOf(input['source'])) : undefined
  if (matched === undefined) return data
  const rule = await activeOwners(req, matched)
  if (rule.ownerIds.length === 0) return data
  const counted = await req.payload.count({
    collection: COLLECTIONS.leads,
    where: leadsUnder(rule),
    overrideAccess: true,
    req,
  })
  return { ...input, owner: nextOwner(rule, counted.totalDocs) }
}
