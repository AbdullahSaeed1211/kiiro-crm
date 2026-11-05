import { asId, type Id } from '@ops/kernel'
import type {
  BillingDocument,
  DocumentChange,
  PortalLink,
  PortalLinkStore,
  PortalProject,
  PortalReader,
} from '@ops/module-billing'
import type { CollectionSlug, PayloadRequest, Where } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { toBillingDocument } from './billing-mapping'
import { setColumns, writeIfUnchanged } from './conditional-write'
import { fieldOf, idOf, numberOf, textOf, type Doc } from './documents'
import { createAsSystem, findAsUser } from './local-api'
import { toWorkflow } from './workflow-mapping'

const LINKS = COLLECTIONS.portalLinks
const MAX_SHOWN = 200

interface SystemQuery {
  readonly collection: CollectionSlug
  readonly where: Where
  readonly sort?: string
}

/**
 * A read as system work. Every portal read passes an organization filter; nothing here relies on a user. The limit is
 * real: `pagination: false` would read every row and make `MAX_SHOWN` meaningless.
 */
async function findAsSystem(req: PayloadRequest, query: SystemQuery): Promise<Doc[]> {
  const page = await req.payload.find({
    collection: query.collection,
    where: query.where,
    limit: MAX_SHOWN,
    depth: 0,
    overrideAccess: true,
    req,
    ...(query.sort === undefined ? {} : { sort: query.sort }),
  })
  return page.docs
}

interface LinkKeys {
  readonly id: Id
  readonly organizationId: Id
  readonly contactId: Id
  readonly tokenHash: string
  readonly expiresAt: number
}

/** The fields a link cannot work without, or undefined when a stored row lacks one. */
function keysOf(doc: Doc): LinkKeys | undefined {
  const keys = {
    id: idOf(fieldOf(doc, 'id')),
    organizationId: idOf(fieldOf(doc, 'organization')),
    contactId: idOf(fieldOf(doc, 'contact')),
    tokenHash: textOf(doc, 'tokenHash'),
    expiresAt: numberOf(doc, 'expiresAt') ?? undefined,
  }
  return Object.values(keys).includes(undefined) ? undefined : (keys as LinkKeys)
}

function toLink(doc: Doc): PortalLink | undefined {
  const keys = keysOf(doc)
  if (keys === undefined) return undefined
  return {
    ...keys,
    email: textOf(doc, 'email') ?? '',
    revokedAt: numberOf(doc, 'revokedAt'),
    lastOpenedAt: numberOf(doc, 'lastOpenedAt'),
    createdById: idOf(fieldOf(doc, 'createdBy')) ?? asId(''),
    createdAt: Date.parse(textOf(doc, 'createdAt') ?? '') || 0,
  }
}

const links = (docs: readonly Doc[]): PortalLink[] => docs.flatMap((doc) => toLink(doc) ?? [])

/** Sets one link's timestamp column only, so an open and a revoke at the same moment cannot undo each other. */
async function patchLink(req: PayloadRequest, id: Id, data: Record<string, number>): Promise<void> {
  await setColumns(req.payload, { collection: LINKS, id, data })
}

/**
 * Portal links. Writes and token lookups are system work, since the client has no session; the list on a client's
 * page reads with the staff member's access.
 */
export function createPortalLinkStore(req: PayloadRequest): PortalLinkStore {
  return {
    create: async (input) => {
      const doc = await createAsSystem(req, LINKS, {
        organization: input.organizationId,
        contact: input.contactId,
        email: input.email,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdBy: input.createdById,
      })
      const link = toLink(doc)
      if (link === undefined) throw new Error('Could not save the portal link')
      return link
    },
    get: async (id) => links(await findAsUser(req, { collection: LINKS, where: { id: { equals: id } }, limit: 1 }))[0],
    findByTokenHash: async (tokenHash) =>
      links(await findAsSystem(req, { collection: LINKS, where: { tokenHash: { equals: tokenHash } } }))[0],
    listForOrganization: async (organizationId) =>
      links(
        await findAsUser(req, {
          collection: LINKS,
          where: { organization: { equals: organizationId } },
          sort: '-createdAt',
          limit: 50,
        }),
      ),
    markRevoked: (id, at) => patchLink(req, id, { revokedAt: at }),
    markOpened: (id, at) => patchLink(req, id, { lastOpenedAt: at }),
  }
}

/** Stage names by `workflowId:stageId`, for the workflows the projects use. */
async function stageNames(req: PayloadRequest, workflowIds: readonly Id[]): Promise<ReadonlyMap<string, string>> {
  if (workflowIds.length === 0) return new Map()
  const docs = await findAsSystem(req, { collection: COLLECTIONS.workflows, where: { id: { in: [...workflowIds] } } })
  return new Map(
    docs.flatMap((doc) => {
      const workflow = toWorkflow(doc)
      return workflow === undefined ? [] : workflow.stages.map((stage) => [`${workflow.id}:${stage.id}`, stage.name])
    }),
  )
}

/** Open and done task counts per project. */
async function taskCounts(req: PayloadRequest, projectIds: readonly Id[]) {
  const counts = new Map<string, { open: number; done: number }>()
  if (projectIds.length === 0) return counts
  const tasks = await req.payload.find({
    collection: COLLECTIONS.tasks,
    where: { project: { in: [...projectIds] } },
    select: { project: true, completedAt: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  for (const task of tasks.docs) {
    const projectId = idOf(fieldOf(task, 'project'))
    if (projectId === undefined) continue
    const entry = counts.get(projectId) ?? { open: 0, done: 0 }
    if (numberOf(task, 'completedAt') === null) entry.open += 1
    else entry.done += 1
    counts.set(projectId, entry)
  }
  return counts
}

async function projectsOf(req: PayloadRequest, organizationId: Id): Promise<PortalProject[]> {
  const docs = await findAsSystem(req, {
    collection: COLLECTIONS.projects,
    where: { organization: { equals: organizationId } },
    sort: 'name',
  })
  const workflowIds = [...new Set(docs.flatMap((doc) => idOf(fieldOf(doc, 'workflow')) ?? []))]
  const [names, counts] = await Promise.all([
    stageNames(req, workflowIds),
    taskCounts(
      req,
      docs.flatMap((doc) => idOf(fieldOf(doc, 'id')) ?? []),
    ),
  ])
  return docs.flatMap((doc) => {
    const id = idOf(fieldOf(doc, 'id'))
    if (id === undefined) return []
    const stageKey = `${idOf(fieldOf(doc, 'workflow')) ?? ''}:${textOf(doc, 'stageId') ?? ''}`
    const count = counts.get(id) ?? { open: 0, done: 0 }
    return [
      {
        id,
        name: textOf(doc, 'name') ?? '',
        stage: names.get(stageKey) ?? '',
        dueAt: numberOf(doc, 'targetEndAt'),
        openTasks: count.open,
        doneTasks: count.done,
      },
    ]
  })
}

/** What one client may see. Every query is narrowed to the link's organization. */
export function createPortalReader(req: PayloadRequest): PortalReader {
  return {
    organizationName: async (id) =>
      textOf(
        (await findAsSystem(req, { collection: COLLECTIONS.organizations, where: { id: { equals: id } } }))[0] ?? {},
        'name',
      ),
    documents: async (organizationId) =>
      (
        await findAsSystem(req, {
          collection: COLLECTIONS.billingDocuments,
          where: { organization: { equals: organizationId } },
          sort: '-createdAt',
        })
      ).flatMap((doc) => toBillingDocument(doc) ?? []),
    projects: (organizationId) => projectsOf(req, organizationId),
  }
}

/** The client's answer to a quote, written only while the quote is unchanged since the client loaded it. */
export async function decideAsSystem(
  req: PayloadRequest,
  document: BillingDocument,
  change: DocumentChange,
): Promise<BillingDocument | undefined> {
  const expected = new Date(document.updatedAt).toISOString()
  const updatedAt = new Date(Math.max(Date.now(), document.updatedAt + 1)).toISOString()
  const written = await writeIfUnchanged(req.payload, {
    collection: COLLECTIONS.billingDocuments,
    id: document.id,
    expectedUpdatedAt: expected,
    updatedAt,
    data: { ...change },
  })
  if (!written) return undefined
  const [doc] = await findAsSystem(req, {
    collection: COLLECTIONS.billingDocuments,
    where: { id: { equals: document.id } },
  })
  return doc === undefined ? undefined : toBillingDocument(doc)
}
