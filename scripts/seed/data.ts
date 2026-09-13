/** Password of every seeded user. */
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- local development password fixed by spec §6.9
export const DEV_PASSWORD = 'DevPassword123!'

/** Settings global values the seed ensures. */
export const APP_SETTINGS = { appName: 'Demo Workspace', timezone: 'America/New_York' } as const

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

/** A seeded project, owned by the manager inside the seeded organization. */
export interface ProjectSeed {
  readonly name: string
  readonly stage: string
  readonly members: readonly UserKey[]
  readonly startDay: number
  readonly targetEndDay: number
}

/** A seeded task; days are offsets from now. */
export interface TaskSeed {
  readonly title: string
  readonly stage: string
  readonly priority: 'none' | 'low' | 'medium' | 'high' | 'urgent'
  readonly assignees: readonly UserKey[]
  readonly group?: string
  readonly project?: string
  readonly startDay: number
  readonly dueDay: number
}

const DESIGN = 'Design'
const DEVELOPMENT = 'Development'
const IN_PROGRESS = 'In progress'
const WEBSITE = 'Website redesign'
const MOBILE = 'Mobile app build'

/** Seeded groups. */
export const GROUPS: readonly string[] = [DESIGN, DEVELOPMENT]

/** Seeded users; a user appears after the user it reports to. */
export const USERS: readonly UserSeed[] = [
  { key: 'owner', email: 'owner@example.test', name: 'Demo Owner', role: 'owner' },
  { key: 'manager', email: 'manager@example.test', name: 'Demo Manager', role: 'manager' },
  {
    key: 'staff1',
    email: 'staff1@example.test',
    name: 'Staff One',
    role: 'staff',
    group: DESIGN,
    reportsTo: 'manager',
  },
  {
    key: 'staff2',
    email: 'staff2@example.test',
    name: 'Staff Two',
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

/** The seeded organization, owned by the manager. */
export const ORGANIZATION = { name: 'Example Organization', email: 'hello@example.test' } as const

/** Seeded projects. */
export const PROJECTS: readonly ProjectSeed[] = [
  { name: WEBSITE, stage: IN_PROGRESS, members: ['staff1'], startDay: -3, targetEndDay: 30 },
  { name: MOBILE, stage: 'Planned', members: [], startDay: 5, targetEndDay: 60 },
]

/** Seeded tasks in board order. */
export const TASKS: readonly TaskSeed[] = [
  {
    title: 'Audit current site pages',
    stage: 'Done',
    priority: 'medium',
    assignees: ['staff1'],
    group: DESIGN,
    project: WEBSITE,
    startDay: -3,
    dueDay: -2,
  },
  {
    title: 'Set up code repository',
    stage: 'Done',
    priority: 'high',
    assignees: ['staff2'],
    group: DEVELOPMENT,
    project: MOBILE,
    startDay: -3,
    dueDay: -1,
  },
  {
    title: 'Draft homepage wireframes',
    stage: 'Review',
    priority: 'high',
    assignees: ['staff1'],
    group: DESIGN,
    project: WEBSITE,
    startDay: -2,
    dueDay: 0,
  },
  {
    title: 'Review hosting options',
    stage: 'Review',
    priority: 'medium',
    assignees: ['staff2'],
    group: DEVELOPMENT,
    startDay: -2,
    dueDay: 1,
  },
  {
    title: 'Design style guide',
    stage: IN_PROGRESS,
    priority: 'high',
    assignees: ['staff1'],
    group: DESIGN,
    project: WEBSITE,
    startDay: -1,
    dueDay: 2,
  },
  {
    title: 'Build sign-in screen',
    stage: IN_PROGRESS,
    priority: 'urgent',
    assignees: ['staff2'],
    group: DEVELOPMENT,
    project: MOBILE,
    startDay: -1,
    dueDay: 3,
  },
  {
    title: 'Write service page copy',
    stage: IN_PROGRESS,
    priority: 'medium',
    assignees: [],
    project: WEBSITE,
    startDay: 0,
    dueDay: 4,
  },
  { title: 'Plan launch checklist', stage: 'To do', priority: 'low', assignees: [], startDay: 0, dueDay: 5 },
  {
    title: 'Build contact form',
    stage: 'To do',
    priority: 'medium',
    assignees: ['staff2'],
    group: DEVELOPMENT,
    project: WEBSITE,
    startDay: 1,
    dueDay: 6,
  },
  {
    title: 'Prepare app icon concepts',
    stage: 'To do',
    priority: 'low',
    assignees: ['staff1'],
    group: DESIGN,
    project: MOBILE,
    startDay: 2,
    dueDay: 7,
  },
  {
    title: 'Schedule kickoff meeting',
    stage: 'Backlog',
    priority: 'none',
    assignees: [],
    project: MOBILE,
    startDay: 3,
    dueDay: 8,
  },
  {
    title: 'Research analytics tools',
    stage: 'Backlog',
    priority: 'low',
    assignees: ['staff1', 'staff2'],
    startDay: 5,
    dueDay: 10,
  },
]
