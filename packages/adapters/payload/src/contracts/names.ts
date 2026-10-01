/** Collection slugs of the spike subset of spec §11; collections, access functions and repositories share them. */
export const COLLECTIONS = {
  users: 'users',
  groups: 'groups',
  organizations: 'organizations',
  projects: 'projects',
  tasks: 'tasks',
  workflows: 'workflows',
  activity: 'activity',
  attachments: 'attachments',
  notifications: 'notifications',
  emailMessages: 'emailMessages',
  jobRuns: 'jobRuns',
  intakeForms: 'intakeForms',
  intakeSubmissions: 'intakeSubmissions',
  contacts: 'contacts',
  leads: 'leads',
  deals: 'deals',
  sources: 'sources',
  lostReasons: 'lostReasons',
  stageTransitions: 'stageTransitions',
  timeEntries: 'timeEntries',
  webhookDeliveries: 'webhookDeliveries',
  demoManifests: 'demoManifests',
} as const

/** One of the spike collection slugs. */
export type SpikeCollectionSlug = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

/** Slug of the tenant settings global. */
export const SETTINGS_GLOBAL = 'settings'

/**
 * Field names that access functions query, so collections must use exactly these names.
 * Relationship fields store Payload ids; `assignees`, `members` and `groups` are has-many relationships to users or groups.
 */
export const FIELDS = {
  role: 'role',
  active: 'active',
  groups: 'groups',
  reportsTo: 'reportsTo',
  owner: 'owner',
  assignees: 'assignees',
  group: 'group',
  members: 'members',
  project: 'project',
  user: 'user',
  uploadedBy: 'uploadedBy',
} as const

/** Platform record type of each scoped collection. */
export const RECORD_TYPES = {
  organizations: 'organization',
  projects: 'project',
  tasks: 'task',
  contacts: 'contact',
  leads: 'lead',
  deals: 'deal',
} as const

/**
 * Record types that can receive email, with the collection each lives in and how an inbound sender is verified:
 * `email` compares the record's own email field, `contacts` compares the deal's linked contacts, `none` never matches.
 */
export const MAILABLE_RECORDS = [
  { type: RECORD_TYPES.organizations, collection: COLLECTIONS.organizations, sender: 'email' },
  { type: RECORD_TYPES.projects, collection: COLLECTIONS.projects, sender: 'none' },
  { type: RECORD_TYPES.tasks, collection: COLLECTIONS.tasks, sender: 'none' },
  { type: RECORD_TYPES.contacts, collection: COLLECTIONS.contacts, sender: 'email' },
  { type: RECORD_TYPES.leads, collection: COLLECTIONS.leads, sender: 'email' },
  { type: RECORD_TYPES.deals, collection: COLLECTIONS.deals, sender: 'contacts' },
] as const

/** Collections that track staleness via stage and updatedAt, indexed by record type. */
export const STALE_TRACKABLE_COLLECTIONS = [
  [RECORD_TYPES.leads, COLLECTIONS.leads],
  [RECORD_TYPES.deals, COLLECTIONS.deals],
  [RECORD_TYPES.projects, COLLECTIONS.projects],
] as const

/**
 * Field names of the CRM collections (spec §10.1), shared by collections and repositories.
 * Relationships store Payload ids; `contacts` and `assignees` are has-many; money is `valueAmountMinor` + `valueCurrency`.
 */
export const CRM_FIELDS = {
  organization: ['name', 'website', 'phone', 'email', 'owner', 'source', 'customData'],
  contact: ['firstName', 'lastName', 'email', 'phone', 'organization', 'owner', 'customData'],
  lead: [
    'title',
    'firstName',
    'lastName',
    'email',
    'phone',
    'companyName',
    'organization',
    'source',
    'owner',
    'assignees',
    'workflow',
    'stageId',
    'stageEnteredAt',
    'lostReason',
    'lostNote',
    'nextActionAt',
    'convertedAt',
    'convertedDeal',
    'customData',
  ],
  deal: [
    'title',
    'organization',
    'contacts',
    'primaryContact',
    'valueAmountMinor',
    'valueCurrency',
    'expectedCloseAt',
    'closedAt',
    'owner',
    'assignees',
    'workflow',
    'stageId',
    'stageEnteredAt',
    'sourceLead',
    'lostReason',
    'lostNote',
    'customData',
  ],
  lookup: ['name'],
  stageTransition: [
    'recordType',
    'recordId',
    'workflow',
    'fromStageId',
    'toStageId',
    'fromCategory',
    'toCategory',
    'changedBy',
    'changedAt',
    'durationMs',
  ],
} as const
