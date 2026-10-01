import type { ApiContract, ApiQueryParam } from './contract-types'

const PAGING: readonly ApiQueryParam[] = [
  { name: 'page', description: 'Page number, from 1.', schema: { type: 'integer', minimum: 1, default: 1 } },
  {
    name: 'limit',
    description: 'Rows per page, 1 to 100.',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
  },
]

const expectedVersion = {
  type: 'object',
  properties: { expectedUpdatedAt: { type: 'integer', minimum: 0 } },
  required: ['expectedUpdatedAt'],
  additionalProperties: false,
} as const

const archived = (noun: string, singular: string) =>
  ({
    [`${noun}.archive`]: {
      method: 'DELETE',
      path: `/api/v1/${noun}/:id`,
      summary: `Archive a ${singular}: it leaves every list and search and can be restored. Owners and managers only.`,
      query: [{ name: 'expectedUpdatedAt', description: 'Refuse if the record changed since this version.' }],
      success: 200,
    },
    [`${noun}.restore`]: {
      method: 'POST',
      path: `/api/v1/${noun}/:id/restore`,
      summary: `Bring an archived ${singular} back. Owners and managers only.`,
      bodyJson: expectedVersion,
      success: 200,
    },
  }) as const

/** Endpoints beyond the record commands: archive, lists of people, and the collaboration, messaging and data endpoints. */
export const EXTRA_CONTRACTS = {
  ...archived('leads', 'lead'),
  ...archived('deals', 'deal'),
  ...archived('contacts', 'contact'),
  ...archived('organizations', 'organization'),
  ...archived('tasks', 'task'),
  ...archived('projects', 'project'),
  'groups.list': {
    method: 'GET',
    path: '/api/v1/groups',
    summary: 'Groups, by name.',
    query: PAGING,
    success: 200,
  },
  'members.list': {
    method: 'GET',
    path: '/api/v1/members',
    summary: 'People in the workspace with role, status and groups. Owners and managers only.',
    query: PAGING,
    success: 200,
  },
  'invitations.list': {
    method: 'GET',
    path: '/api/v1/invitations',
    summary: 'Invitations still waiting to be accepted. Owners and managers only.',
    query: PAGING,
    success: 200,
  },
  'comments.create': {
    method: 'POST',
    path: '/api/v1/comments',
    summary: 'Add a note to a record. @name mentions notify teammates.',
    bodyJson: {
      type: 'object',
      properties: {
        recordType: { type: 'string', enum: ['organization', 'contact', 'lead', 'deal', 'project', 'task'] },
        recordId: { type: 'string' },
        body: { type: 'string', minLength: 1 },
      },
      required: ['recordType', 'recordId', 'body'],
    },
    success: 201,
  },
  'comments.delete': {
    method: 'DELETE',
    path: '/api/v1/comments/:commentId',
    summary: 'Delete your own note (owners and managers can delete any).',
    success: 200,
  },
  'files.upload': {
    method: 'POST',
    path: '/api/v1/files',
    summary: 'Attach a file to a record (multipart form: recordType, recordId, file).',
    upload: true,
    success: 201,
  },
  'files.download': {
    method: 'GET',
    path: '/api/v1/files/:attachmentId',
    summary: 'Download an attachment.',
    returns: 'file',
    success: 200,
  },
  'email.send': {
    method: 'POST',
    path: '/api/v1/email/send',
    summary: 'Send an email from a record and keep it in that record’s history.',
    bodyJson: {
      type: 'object',
      properties: {
        recordType: { type: 'string' },
        recordId: { type: 'string' },
        to: { type: 'array', items: { type: 'string', format: 'email' }, minItems: 1, maxItems: 50 },
        subject: { type: 'string', minLength: 1 },
        textBody: { type: 'string', minLength: 1 },
        attachmentIds: { type: 'array', items: { type: 'string' } },
        inReplyTo: { type: 'string' },
      },
      required: ['recordType', 'recordId', 'to', 'subject', 'textBody'],
    },
    success: 201,
  },
  'email.markRead': {
    method: 'PATCH',
    path: '/api/v1/email/:messageId/read',
    summary: 'Mark a received email as read.',
    success: 200,
  },
  'sms.status': {
    method: 'GET',
    path: '/api/v1/sms/send',
    summary: 'Whether text messaging is set up for this workspace.',
    success: 200,
  },
  'sms.send': {
    method: 'POST',
    path: '/api/v1/sms/send',
    summary: 'Text the phone number on a contact, lead or organization (country code required, 480 characters).',
    bodyJson: {
      type: 'object',
      properties: {
        recordType: { type: 'string', enum: ['contact', 'lead', 'organization'] },
        recordId: { type: 'string' },
        body: { type: 'string', minLength: 1, maxLength: 480 },
      },
      required: ['recordType', 'recordId', 'body'],
      additionalProperties: false,
    },
    success: 201,
  },
  'notifications.list': {
    method: 'GET',
    path: '/api/v1/notifications',
    summary: 'Your recent notifications.',
    success: 200,
  },
  'notifications.unreadCount': {
    method: 'GET',
    path: '/api/v1/notifications/unread-count',
    summary: 'How many notifications you have not read.',
    success: 200,
  },
  'notifications.markRead': {
    method: 'PATCH',
    path: '/api/v1/notifications/:notificationId',
    summary: 'Mark a notification as read.',
    success: 200,
  },
  'search.records': {
    method: 'GET',
    path: '/api/v1/search',
    summary: 'Find records of every type you can see. q is 2 to 80 characters.',
    query: [{ name: 'q', description: 'Text to find (2 to 80 characters).' }],
    success: 200,
  },
  'export.records': {
    method: 'GET',
    path: '/api/v1/export/:recordType',
    summary: 'Download a CSV of one record type. Owners and managers only.',
    returns: 'csv',
    success: 200,
  },
  'export.time': {
    method: 'GET',
    path: '/api/v1/export/time',
    summary: 'Download logged time as CSV. Owners and managers only.',
    query: [
      { name: 'from', description: 'First day, YYYY-MM-DD.' },
      { name: 'to', description: 'Last day, YYYY-MM-DD.' },
    ],
    returns: 'csv',
    success: 200,
  },
  'import.template': {
    method: 'GET',
    path: '/api/v1/import/template/:recordType',
    summary: 'Download a blank CSV template for importing one record type.',
    returns: 'csv',
    success: 200,
  },
  'demo.status': {
    method: 'GET',
    path: '/api/v1/demo',
    summary: 'Whether demo data is present and how much. Owners only.',
    success: 200,
  },
  'demo.purge': {
    method: 'DELETE',
    path: '/api/v1/demo',
    summary: 'Remove all demo data and nothing else. Owners only.',
    success: 200,
  },
} as const satisfies Readonly<Record<string, ApiContract>>

const SORT_PARAM: ApiQueryParam = {
  name: 'sort',
  description: 'createdAt, -createdAt (default), updatedAt or -updatedAt.',
}

const FILTERS: Readonly<Record<string, readonly ApiQueryParam[]>> = {
  leads: [
    { name: 'q', description: 'Text to find in title, name, email and company.' },
    { name: 'ownerId', description: 'Only leads owned by this person.' },
    { name: 'stageId', description: 'Only leads in this stage.' },
    SORT_PARAM,
  ],
  deals: [
    { name: 'q', description: 'Text to find in the title.' },
    { name: 'ownerId', description: 'Only deals owned by this person.' },
    { name: 'stageId', description: 'Only deals in this stage.' },
    SORT_PARAM,
  ],
  contacts: [
    { name: 'q', description: 'Text to find in name and email.' },
    { name: 'ownerId', description: 'Only contacts owned by this person.' },
    SORT_PARAM,
  ],
  organizations: [
    { name: 'q', description: 'Text to find in name, email and website.' },
    { name: 'ownerId', description: 'Only organizations owned by this person.' },
    SORT_PARAM,
  ],
  tasks: [
    { name: 'q', description: 'Text to find in the title.' },
    { name: 'stageId', description: 'Only tasks in this stage.' },
    { name: 'assigneeId', description: 'Only tasks assigned to this person.' },
    { name: 'projectId', description: 'Only tasks in this project.' },
  ],
}

/** Query parameters of a `*.list` contract: the paging every list takes, and the filters its type supports. */
export function listQuery(contractId: string): readonly ApiQueryParam[] | undefined {
  if (!contractId.endsWith('.list')) return undefined
  return [...PAGING, ...(FILTERS[contractId.slice(0, -'.list'.length)] ?? [])]
}
