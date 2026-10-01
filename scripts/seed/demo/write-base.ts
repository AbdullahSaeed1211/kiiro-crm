import { USERS } from '../data'
import { LOCAL, type Doc, type SeedPayload } from '../payload'
import { COLLECTIONS, createDoc, idFor, type WriteContext } from './context'
import { EMAIL_TEMPLATES } from './content'
import { TEAM } from './people'

/** A workflow with its stages by name. */
export interface WorkflowInfo {
  readonly id: string
  readonly stages: ReadonlyMap<string, { readonly id: string; readonly category: string }>
}

export type Workflows = Readonly<Record<'lead' | 'deal' | 'project' | 'task', WorkflowInfo>>

const equals = (value: string) => ({ equals: value })

async function findOne(
  payload: SeedPayload,
  collection: string,
  where: Record<string, unknown>,
): Promise<Doc | undefined> {
  return (await payload.find({ ...LOCAL, collection, where, limit: 1 })).docs[0]
}

function stageMap(doc: Doc): WorkflowInfo['stages'] {
  const rows = Array.isArray(doc['stages']) ? (doc['stages'] as readonly Record<string, unknown>[]) : []
  return new Map(rows.map((row) => [String(row['name']), { id: String(row['id']), category: String(row['category']) }]))
}

export async function loadWorkflows(payload: SeedPayload): Promise<Workflows> {
  const load = async (recordType: string): Promise<WorkflowInfo> => {
    const doc = await findOne(payload, COLLECTIONS.workflows, { recordType: equals(recordType) })
    if (doc === undefined) throw new Error(`no ${recordType} workflow; run seed:dev first`)
    return { id: doc.id, stages: stageMap(doc) }
  }
  return {
    lead: await load('lead'),
    deal: await load('deal'),
    project: await load('project'),
    task: await load('task'),
  }
}

/** Ids of the lead sources and lost reasons the base seed made, by name. */
export async function loadLookups(
  payload: SeedPayload,
): Promise<{ sources: Map<string, string>; lostReasons: Map<string, string> }> {
  const read = async (collection: string): Promise<Map<string, string>> =>
    new Map(
      (await payload.find({ ...LOCAL, collection, where: {}, limit: 100 })).docs.map((doc) => [
        String(doc['name']),
        doc.id,
      ]),
    )
  return { sources: await read(COLLECTIONS.sources), lostReasons: await read(COLLECTIONS.lostReasons) }
}

/** The four base users by key, as full documents. */
export async function loadBaseUsers(payload: SeedPayload): Promise<Map<string, Doc>> {
  const users = new Map<string, Doc>()
  for (const seed of USERS) {
    const doc = await findOne(payload, COLLECTIONS.users, { email: equals(seed.email) })
    if (doc === undefined) throw new Error(`base user ${seed.email} is missing; run seed:dev first`)
    users.set(seed.key, doc)
  }
  return users
}

/** Adds the demo team members (staff reporting to the manager) and records their ids. */
export async function ensureTeam(context: WriteContext): Promise<void> {
  const groups = new Map(
    (await context.payload.find({ ...LOCAL, collection: COLLECTIONS.groups, where: {}, limit: 20 })).docs.map((doc) => [
      String(doc['name']),
      doc.id,
    ]),
  )
  const manager = idFor(context, 'manager')
  for (const member of TEAM) {
    const existing = await findOne(context.payload, COLLECTIONS.users, { email: equals(member.email) })
    if (existing !== undefined) {
      context.ids.set(member.key, existing.id)
      context.users.set(member.key, existing)
      continue
    }
    const groupId = member.group === null ? undefined : groups.get(member.group)
    await createDoc(context, {
      collection: COLLECTIONS.users,
      key: member.key,
      data: {
        email: member.email,
        name: member.name,
        role: 'staff',
        password: context.password,
        groups: groupId === undefined ? [] : [groupId],
        reportsTo: manager,
      },
    })
    const created = await findOne(context.payload, COLLECTIONS.users, { email: equals(member.email) })
    if (created !== undefined) context.users.set(member.key, created)
  }
}

interface FieldSeed {
  readonly recordType: string
  readonly key: string
  readonly label: string
  readonly type: string
  readonly options: readonly string[]
  readonly position: number
}

const SERVICE_OPTIONS = [
  'Website',
  'SEO',
  'Social media',
  'Design',
  'App development',
  'Ads',
  'Email marketing',
  'Branding',
]
const FIELDS: readonly FieldSeed[] = [
  {
    recordType: 'lead',
    key: 'service',
    label: 'Service wanted',
    type: 'select',
    options: SERVICE_OPTIONS,
    position: 1,
  },
  {
    recordType: 'lead',
    key: 'budget',
    label: 'Budget range',
    type: 'select',
    options: ['Under 5k', '5k-20k', '20k-50k', '50k+'],
    position: 2,
  },
  {
    recordType: 'deal',
    key: 'serviceLines',
    label: 'Service lines',
    type: 'multiSelect',
    options: SERVICE_OPTIONS,
    position: 1,
  },
  {
    recordType: 'contact',
    key: 'newsletter',
    label: 'Newsletter subscriber',
    type: 'checkbox',
    options: [],
    position: 100,
  },
  { recordType: 'lead', key: 'newsletter', label: 'Newsletter opt-in', type: 'checkbox', options: [], position: 100 },
  {
    recordType: 'contact',
    key: 'audiences',
    label: 'Newsletter audiences',
    type: 'multiSelect',
    options: ['Clients', 'Prospects', 'Partners'],
    position: 101,
  },
]

/** Custom fields the demo records fill in (service, budget, newsletter); existing ones are left alone. */
export async function ensureFieldDefinitions(context: WriteContext): Promise<void> {
  for (const field of FIELDS) {
    const existing = await findOne(context.payload, 'fieldDefinitions', {
      and: [{ recordType: equals(field.recordType) }, { key: equals(field.key) }],
    })
    if (existing !== undefined) continue
    await createDoc(context, {
      collection: 'fieldDefinitions',
      data: {
        ...field,
        options: [...field.options],
        required: false,
        visibility: 'all',
        sensitive: false,
        hidden: false,
      },
    })
  }
}

/** Saved email templates and a response target, only when the workspace has none of its own. */
export async function applySettings(payload: SeedPayload): Promise<void> {
  const current = await payload.findGlobal({ ...LOCAL, slug: 'settings' })
  const templates = Array.isArray(current['emailTemplates']) ? current['emailTemplates'] : []
  if (templates.length > 0) return
  await payload.updateGlobal({
    ...LOCAL,
    slug: 'settings',
    data: {
      responseTargetHours: 24,
      emailTemplates: EMAIL_TEMPLATES.map((template, index) => ({ id: `demo-template-${String(index)}`, ...template })),
    },
  })
}

type CastSeed = (typeof USERS)[number]

/** Makes one demo user, or reuses the one with that email, and records its id and document. */
async function ensureCastMember(context: WriteContext, seed: CastSeed, groups: ReadonlyMap<string, string>) {
  let doc = await findOne(context.payload, COLLECTIONS.users, { email: equals(seed.email) })
  if (doc === undefined) {
    const group = seed.group === undefined ? undefined : groups.get(seed.group)
    const manager = seed.reportsTo === undefined ? undefined : context.ids.get(seed.reportsTo)
    await createDoc(context, {
      collection: COLLECTIONS.users,
      key: seed.key,
      data: {
        email: seed.email,
        name: seed.name,
        role: seed.role,
        password: context.password,
        groups: group === undefined ? [] : [group],
        ...(manager === undefined ? {} : { reportsTo: manager }),
      },
    })
    doc = await findOne(context.payload, COLLECTIONS.users, { email: equals(seed.email) })
  }
  if (doc === undefined) return
  context.ids.set(seed.key, doc.id)
  context.users.set(seed.key, doc)
}

/**
 * For a workspace that is not the local one: the real owner stands in for the demo owner, and the manager and two staff
 * leads are made as demo users, so the demo records have the same cast without touching anyone's real account.
 */
export async function ensureWorkspaceCast(context: WriteContext): Promise<void> {
  const found = await context.payload.find({ ...LOCAL, collection: COLLECTIONS.groups, where: {}, limit: 50 })
  const groups = new Map(found.docs.map((doc) => [String(doc['name']), doc.id]))
  // The manager is made first because the staff leads report to them.
  for (const seed of USERS.filter((user) => user.key !== 'owner')) await ensureCastMember(context, seed, groups)
}

/** The workspace's own owner account, who stands in as the demo owner. */
export async function findWorkspaceOwner(payload: SeedPayload): Promise<Doc> {
  const owner = await findOne(payload, COLLECTIONS.users, {
    and: [{ role: equals('owner') }, { active: equals('true') }],
  })
  if (owner === undefined) throw new Error('the workspace has no active owner to act as the demo owner')
  return owner
}
