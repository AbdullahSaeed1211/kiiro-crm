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
} as const
