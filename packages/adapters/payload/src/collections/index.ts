import type { CollectionConfig } from 'payload'
import { activityCollection } from './activity'
import { attachmentsCollection } from './attachments'
import { contactsCollection } from './contacts'
import { dealsCollection } from './deals'
import { emailMessagesCollection } from './email-messages'
import { groupsCollection } from './groups'
import { jobRunsCollection } from './job-runs'
import { leadsCollection } from './leads'
import { lostReasonsCollection, sourcesCollection } from './lookups'
import { notificationsCollection } from './notifications'
import { organizationsCollection } from './organizations'
import { projectsCollection } from './projects'
import { stageTransitionsCollection } from './stage-transitions'
import { tasksCollection } from './tasks'
import { usersCollection } from './users'
import { workflowsCollection } from './workflows'

export { ADMIN_GROUPS } from './fields'
export { settingsGlobal } from './settings'

/**
 * Every spike collection in admin navigation order: People, Records, Configuration, System (spec §17.13).
 * Read-only because Payload appends its own collections to the array it is given; pass `[...spikeCollections]`.
 */
export const spikeCollections: readonly CollectionConfig[] = [
  usersCollection,
  groupsCollection,
  organizationsCollection,
  contactsCollection,
  leadsCollection,
  dealsCollection,
  projectsCollection,
  tasksCollection,
  workflowsCollection,
  sourcesCollection,
  lostReasonsCollection,
  activityCollection,
  stageTransitionsCollection,
  attachmentsCollection,
  notificationsCollection,
  emailMessagesCollection,
  jobRunsCollection,
]
