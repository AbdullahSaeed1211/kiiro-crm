'use server'

import { revalidatePath } from 'next/cache'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { requireRole } from '../../auth/context'
import { loadIntakeTargets } from '../../queries/settings/intake-targets'

const ANSWER_NAME = /^[A-Za-z0-9_-]{1,60}$/u
const MAX_MAPPINGS = 60

type Parsed = Readonly<{ ok: true; value: Record<string, string> }> | Readonly<{ ok: false; message: string }>

function entryProblem(name: string, target: unknown, allowed: ReadonlySet<string>): string | undefined {
  if (!ANSWER_NAME.test(name)) return `Answer name "${name}" may use letters, digits, - and _ only.`
  if (typeof target !== 'string' || !allowed.has(target)) return `Choose where the "${name}" answer goes.`
  return undefined
}

function parseFieldMap(value: unknown, allowed: ReadonlySet<string>): Parsed {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return { ok: false, message: 'Send the field map as an object.' }
  const entries = Object.entries(value)
  if (entries.length > MAX_MAPPINGS) return { ok: false, message: `Map at most ${String(MAX_MAPPINGS)} answers.` }
  const problem = entries
    .map(([name, target]) => entryProblem(name, target, allowed))
    .find((item) => item !== undefined)
  if (problem !== undefined) return { ok: false, message: problem }
  return { ok: true, value: Object.fromEntries(entries.map(([name, target]) => [name, String(target)])) }
}

/** Saves which lead field (built-in or custom) each named form answer fills. */
export async function saveIntakeFieldMap(input: {
  readonly id: string
  readonly fieldMap: unknown
}): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const allowed = new Set((await loadIntakeTargets()).map((target) => target.value))
  const parsed = parseFieldMap(input.fieldMap, allowed)
  if (!parsed.ok) return actionError('VALIDATION', parsed.message)
  const fieldMap = parsed.value
  try {
    await context.payload.update({ collection: 'intakeForms', id: input.id, data: { fieldMap }, req: context.req })
    revalidatePath('/settings/intake')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveIntakeFieldMap', 'Unable to save the field mapping.')
  }
}
