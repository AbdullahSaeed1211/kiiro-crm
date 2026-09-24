/** Password of every seeded user. */
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- local development password fixed by spec §6.9
export const DEV_PASSWORD = 'mirchads@123'

/** Settings global values the seed ensures. */
export const APP_SETTINGS = {
  appName: 'Mirch Media',
  timezone: 'Asia/Kolkata',
  locale: 'en',
  currency: 'INR',
  brand: { primaryHex: '#E45735', radius: 'md' },
  email: {
    fromName: 'Mirch Media',
    fromAddress: 'no-reply@notify.mirchmedia.com',
    inboundDomain: 'in.mirchmedia.com',
    inboundLocalPrefix: 'mirchmedia--',
  },
} as const

/** Key a seed uses to refer to a seeded user. */
export type UserKey = 'owner' | 'manager' | 'staff1' | 'staff2'

/** A seeded user. */
export interface UserSeed {
  readonly key: UserKey
  readonly email: string
  readonly name: string
  readonly role: 'owner' | 'manager' | 'staff'
  readonly group?: string
  readonly reportsTo?: UserKey
}

/** A workflow stage (spec §9.4). */
export interface StageSeed {
  readonly name: string
  readonly category: string
  readonly color: string
  readonly probability?: number
}

/** A seeded workflow; its first stage is the default. */
export interface WorkflowSeed {
  readonly recordType: 'project' | 'task' | 'lead' | 'deal'
  readonly name: string
  readonly stages: readonly StageSeed[]
}

const DESIGN = 'Design'
const DEVELOPMENT = 'Development'
const IN_PROGRESS = 'In progress'
/** Seeded groups. */
export const GROUPS: readonly string[] = [DESIGN, DEVELOPMENT]

/** Seeded users; a user appears after the user it reports to. */
export const USERS: readonly UserSeed[] = [
  { key: 'owner', email: 'mirchads@gmail.com', name: 'Vivek Thapar', role: 'owner' },
  { key: 'manager', email: 'manager@example.test', name: 'Client Services Lead', role: 'manager' },
  {
    key: 'staff1',
    email: 'staff1@example.test',
    name: 'Design & Content Lead',
    role: 'staff',
    group: DESIGN,
    reportsTo: 'manager',
  },
  {
    key: 'staff2',
    email: 'staff2@example.test',
    name: 'Web Development Lead',
    role: 'staff',
    group: DEVELOPMENT,
    reportsTo: 'manager',
  },
]

/** Agency task workflow (spec §18.1). */
export const TASK_WORKFLOW: WorkflowSeed = {
  recordType: 'task',
  name: 'Tasks',
  stages: [
    { name: 'Backlog', category: 'backlog', color: 'gray' },
    { name: 'To do', category: 'open', color: 'blue' },
    { name: IN_PROGRESS, category: 'active', color: 'amber' },
    { name: 'Review', category: 'waiting', color: 'violet' },
    { name: 'Done', category: 'done_success', color: 'green' },
  ],
}

/** Agency project workflow (spec §18.1). */
export const PROJECT_WORKFLOW: WorkflowSeed = {
  recordType: 'project',
  name: 'Projects',
  stages: [
    { name: 'Planned', category: 'backlog', color: 'gray' },
    { name: IN_PROGRESS, category: 'active', color: 'blue' },
    { name: 'On hold', category: 'waiting', color: 'amber' },
    { name: 'Delivered', category: 'done_success', color: 'green' },
    { name: 'Cancelled', category: 'cancelled', color: 'gray' },
  ],
}
