import type { CollectionConfig } from 'payload'
import { activityCollection } from './activity'
import {
  collaborationAttachmentsCollection,
  collaborationNotificationsCollection,
  commentsCollection,
  layoutsCollection,
  notificationPrefsCollection,
  savedViewsCollection,
} from './collaboration'
import { contactsCollection } from './contacts'
import { dealsCollection } from './deals'
import { emailMessagesCollection } from './email-messages'
import { fieldDefinitionsCollection } from './config'
import { jobRunsCollection } from './job-runs'
import { intakeFormsCollection, intakeSubmissionsCollection } from './intake'
import { leadsCollection } from './leads'
import { lostReasonsCollection, sourcesCollection } from './lookups'
import { organizationsCollection } from './organizations'
import { projectsCollection } from './projects'
import { stageTransitionsCollection } from './stage-transitions'
import { tasksCollection } from './tasks'
import { invitationsCollection, peopleGroupsCollection, peopleUsersCollection } from './people'
import { workflowsCollection } from './workflows'

export { ADMIN_GROUPS } from './fields'
export { settingsGlobal } from './settings'

/**
 * Every spike collection in admin navigation order: People, Records, Configuration, System (spec §17.13).
 * Read-only because Payload appends its own collections to the array it is given; pass `[...spikeCollections]`.
 */
export const spikeCollections: readonly CollectionConfig[] = [
  peopleUsersCollection,
  peopleGroupsCollection,
  invitationsCollection,
  organizationsCollection,
  contactsCollection,
  leadsCollection,
  dealsCollection,
  projectsCollection,
  tasksCollection,
  workflowsCollection,
  fieldDefinitionsCollection,
  savedViewsCollection,
  layoutsCollection,
  sourcesCollection,
  lostReasonsCollection,
  notificationPrefsCollection,
  intakeFormsCollection,
  intakeSubmissionsCollection,
  activityCollection,
  stageTransitionsCollection,
  commentsCollection,
  collaborationAttachmentsCollection,
  collaborationNotificationsCollection,
  emailMessagesCollection,
  jobRunsCollection,
]
