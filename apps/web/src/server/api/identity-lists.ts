import { domainError, err, ok, type Result } from '@ops/kernel'
import { isManagerUp } from '@ops/platform'
import type { RequestContext } from '../container'
import { pageOf, pageWindowOf, type PageOf } from './page-window'

const ROLE_ONLY = 'Only owners and managers can see this.'

function ids(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const id = typeof entry === 'string' ? entry : (entry as { id?: unknown } | null)?.id
        return typeof id === 'string' ? [id] : []
      })
    : []
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** `GET /api/v1/groups`: the groups, by name. Anyone signed in can see them, since tasks are assigned to groups. */
export async function listGroupRecords(context: RequestContext, url: URL): Promise<Result<PageOf<unknown>>> {
  const window = pageWindowOf(url)
  if (!window.ok) return window
  const found = await context.payload.find({
    collection: 'groups',
    sort: ['name', 'id'],
    page: window.value.page,
    limit: window.value.limit,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const records = found.docs.map((group) => ({ id: group.id, name: group.name }))
  return ok(pageOf({ records, total: found.totalDocs }, window.value))
}

/** `GET /api/v1/members`: the people in the workspace with their role, status and groups. Owners and managers only. */
export async function listMemberRecords(context: RequestContext, url: URL): Promise<Result<PageOf<unknown>>> {
  if (!isManagerUp(context.actor)) return err(domainError('FORBIDDEN', ROLE_ONLY))
  const window = pageWindowOf(url)
  if (!window.ok) return window
  const found = await context.payload.find({
    collection: 'users',
    sort: ['name', 'id'],
    page: window.value.page,
    limit: window.value.limit,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const records = found.docs.map((user) => ({
    id: user.id,
    name: text(user.name),
    email: text(user.email),
    role: text(user.role),
    active: user.active !== false,
    groupIds: ids(user.groups),
    reportsToId: ids([user.reportsTo]).at(0) ?? null,
  }))
  return ok(pageOf({ records, total: found.totalDocs }, window.value))
}

/** `GET /api/v1/invitations`: invitations still waiting to be accepted, newest first. Owners and managers only. */
export async function listInvitationRecords(context: RequestContext, url: URL): Promise<Result<PageOf<unknown>>> {
  if (!isManagerUp(context.actor)) return err(domainError('FORBIDDEN', ROLE_ONLY))
  const window = pageWindowOf(url)
  if (!window.ok) return window
  const found = await context.payload.find({
    collection: 'invitations',
    where: { status: { equals: 'pending' } },
    sort: ['-createdAt', 'id'],
    page: window.value.page,
    limit: window.value.limit,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const records = found.docs.map((invitation) => ({
    id: invitation.id,
    email: text(invitation.email),
    role: text(invitation.role),
    groupIds: ids(invitation.groups),
    expiresAt: typeof invitation.expiresAt === 'number' ? invitation.expiresAt : null,
  }))
  return ok(pageOf({ records, total: found.totalDocs }, window.value))
}
