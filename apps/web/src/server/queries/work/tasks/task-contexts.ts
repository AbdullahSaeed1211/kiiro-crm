import { COLLECTIONS } from '@ops/adapter-payload'
import type { TaskRecord } from '@ops/module-work'
import type { CollectionSlug } from 'payload'
import type { RequestContext } from '../../../container'
import type { TaskListItem } from './types'

type ContextType = 'project' | 'organization' | 'contact' | 'lead' | 'deal'
type ContextSource = Pick<TaskRecord, 'id' | 'projectId' | 'relatedType' | 'relatedId'>
type ContextLabel = NonNullable<TaskListItem['context']>
type ContextLabels = ReadonlyMap<ContextType, ReadonlyMap<string, string>>
type ContextTarget = Readonly<{
  collection: CollectionSlug
  href: string
  select: Readonly<Record<string, true>>
}>

const TARGETS: Readonly<Record<ContextType, ContextTarget>> = {
  project: { collection: COLLECTIONS.projects, href: '/projects', select: { id: true, name: true } },
  organization: { collection: COLLECTIONS.organizations, href: '/organizations', select: { id: true, name: true } },
  contact: {
    collection: COLLECTIONS.contacts,
    href: '/contacts',
    select: { id: true, firstName: true, lastName: true },
  },
  lead: { collection: COLLECTIONS.leads, href: '/leads', select: { id: true, title: true } },
  deal: { collection: COLLECTIONS.deals, href: '/deals', select: { id: true, title: true } },
}

function contextReference(task: ContextSource): Readonly<{ type: ContextType; id: string }> | null {
  if (task.projectId !== null) return { type: 'project', id: String(task.projectId) }
  const type = task.relatedType
  const id = task.relatedId
  if (id === null || type === null || !(type in TARGETS)) return null
  return { type: type as ContextType, id: String(id) }
}

/** Builds links only for the project or related records available to the current user. */
export function buildTaskContextMap(
  tasks: readonly ContextSource[],
  labelsByType: ContextLabels,
): ReadonlyMap<string, ContextLabel> {
  return new Map(
    tasks.flatMap((task) => {
      const reference = contextReference(task)
      if (reference === null) return []
      const label = labelsByType.get(reference.type)?.get(reference.id)
      if (label === undefined) return []
      const target = TARGETS[reference.type]
      return [[String(task.id), { label, href: `${target.href}/${reference.id}` }] as const]
    }),
  )
}

function labelOf(record: object, type: ContextType): string | null {
  if (type === 'contact') {
    const first: unknown = Reflect.get(record, 'firstName')
    const last: unknown = Reflect.get(record, 'lastName')
    const name = [first, last]
      .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
      .join(' ')
    return name === '' ? null : name
  }
  const field = type === 'lead' || type === 'deal' ? 'title' : 'name'
  const value: unknown = Reflect.get(record, field)
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

async function readLabels(context: RequestContext, type: ContextType, ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const target = TARGETS[type]
  const result = await context.payload.find({
    collection: target.collection,
    where: { id: { in: [...ids] } },
    select: target.select,
    limit: ids.length,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return new Map(
    result.docs.flatMap((record) => {
      const id = Reflect.get(record, 'id')
      const label = labelOf(record, type)
      return typeof id === 'string' && label !== null ? [[id, label] as const] : []
    }),
  )
}

/** Loads task context labels through each record's normal access rules. */
export async function loadTaskContexts(
  context: RequestContext,
  tasks: readonly ContextSource[],
): Promise<ReadonlyMap<string, ContextLabel>> {
  const references = tasks.map((task) => contextReference(task))
  const idsByType = new Map<ContextType, Set<string>>()
  for (const reference of references) {
    if (reference === null) continue
    const ids = idsByType.get(reference.type) ?? new Set<string>()
    ids.add(reference.id)
    idsByType.set(reference.type, ids)
  }
  const entries = await Promise.all(
    [...idsByType].map(async ([type, ids]) => [type, await readLabels(context, type, [...ids])] as const),
  )
  const labelsByType = new Map(entries)
  return buildTaskContextMap(tasks, labelsByType)
}
