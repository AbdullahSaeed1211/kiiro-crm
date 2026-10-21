import { createScheduleItem, listScheduleItems } from '@ops/module-crm'
import { err, domainError } from '@ops/kernel'
import { contractBody } from '@/server/api/contracts'
import { apiRoute } from '@/server/api/http'
import { crmDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

function scheduleQuery(request: Request) {
  const query = new URL(request.url).searchParams
  const fromValue = query.get('from')
  const toValue = query.get('to')
  const from = epochValue(fromValue)
  const to = epochValue(toValue)
  if (!validEpoch(from) || !validEpoch(to))
    return err(domainError('VALIDATION', 'Provide numeric from and to UTC milliseconds.'))
  const scope = query.get('scope')
  const assignee = query.get('assignee')
  if (scope !== null && scope !== 'mine' && scope !== 'team')
    return err(domainError('VALIDATION', 'Scope must be mine or team.'))
  const selectedScope: 'mine' | 'team' = scope === 'team' ? 'team' : 'mine'
  return {
    ok: true as const,
    value: { from, to, scope: selectedScope, ...(assignee === null ? {} : { assigneeId: assignee }) },
  }
}

function epochValue(value: string | null): number {
  return value === null || value.trim() === '' ? Number.NaN : Number(value)
}

function validEpoch(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

/** `schedule.list`: personal range by default; managers may explicitly choose the team. */
export const GET = apiRoute(async ({ request, context }) => {
  const parsed = scheduleQuery(request)
  return parsed.ok ? listScheduleItems(await crmDeps(context), parsed.value) : parsed
})

/** `schedule.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'schedule.create')
  return body.ok ? createScheduleItem(await crmDeps(context), body.value) : body
}, 201)
