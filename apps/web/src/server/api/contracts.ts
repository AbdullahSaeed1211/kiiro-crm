import {
  createTaskSchema,
  taskDayPlanSchema,
  expectedVersionSchema,
  moveTaskSchema,
  taskDatesSchema,
  updateTaskSchema,
  createContentItemSchema,
  respondToDeliverableSchema,
  updateContentItemSchema,
} from '@ops/module-work'
import { logCallSchema } from '@ops/module-crm'
import { inviteMemberSchema, saveGroupSchema, saveMemberSchema } from '@ops/module-identity'
import type { Result } from '@ops/kernel'
import { z } from 'zod'
import { readBody, type BodySchema } from './http'
import type { ApiContract, ApiQueryParam } from './contract-types'
import { BILLING_CONTRACTS } from './contracts-billing'
import { CRM_CONTRACTS } from './contracts-crm'
import { EXPORT_CONTRACTS } from './contracts-export'
import { EXTRA_CONTRACTS, listQuery } from './contracts-extra'
import { ATTENDANCE_CONTRACTS } from './contracts-attendance'
import { PROJECT_CONTRACTS } from './contracts-projects'

/** One endpoint of the product API: the single source for its route, its body validation and `GET /api/v1`. */

/** The product API, keyed by a stable contract id. */
const API_CONTRACTS = {
  ...ATTENDANCE_CONTRACTS,
  ...PROJECT_CONTRACTS,
  'tasks.list': {
    method: 'GET',
    path: '/api/v1/tasks',
    summary: 'Tasks you can see, in rank order; ?page=&limit= (max 100).',
    success: 200,
  },
  'tasks.get': { method: 'GET', path: '/api/v1/tasks/:id', summary: 'One task.', success: 200 },
  'tasks.create': {
    method: 'POST',
    path: '/api/v1/tasks',
    summary: 'Create a task in the default task workflow.',
    body: createTaskSchema,
    success: 201,
  },
  'tasks.update': {
    method: 'PATCH',
    path: '/api/v1/tasks/:id',
    summary: 'Change editable task fields while the task is still at expectedUpdatedAt.',
    body: updateTaskSchema.omit({ taskId: true }),
    success: 200,
  },
  'tasks.move': {
    method: 'POST',
    path: '/api/v1/tasks/:id/move',
    summary: 'Move a task to a stage, optionally between two neighbouring tasks.',
    body: moveTaskSchema.omit({ taskId: true }),
    success: 200,
  },
  'tasks.complete': {
    method: 'POST',
    path: '/api/v1/tasks/:id/complete',
    summary: 'Move a task to its workflow’s done stage.',
    body: expectedVersionSchema,
    success: 200,
  },
  'tasks.reopen': {
    method: 'POST',
    path: '/api/v1/tasks/:id/reopen',
    summary: 'Move a task back to its workflow’s default stage.',
    body: expectedVersionSchema,
    success: 200,
  },
  'tasks.dates': {
    method: 'PUT',
    path: '/api/v1/tasks/:id/dates',
    summary: 'Replace a task’s start and due dates; null clears one.',
    body: taskDatesSchema,
    success: 200,
  },
  'tasks.plan.add': {
    method: 'POST',
    path: '/api/v1/tasks/:id/plan',
    summary: 'Add a task assigned to you to your plan for the workspace calendar day without changing its deadline.',
    body: taskDayPlanSchema.omit({ taskId: true }),
    success: 200,
  },
  'tasks.plan.remove': {
    method: 'DELETE',
    path: '/api/v1/tasks/:id/plan',
    summary: 'Remove your plan entry for a task today without changing the task.',
    success: 200,
  },
  'calls.create': {
    method: 'POST',
    path: '/api/v1/calls',
    summary: 'Log a call against a visible lead or contact.',
    body: logCallSchema,
    success: 201,
  },
  'deliverables.respond': {
    method: 'POST',
    path: '/api/v1/deliverables/:id/response',
    summary: 'Record a client response or re-send a deliverable.',
    body: respondToDeliverableSchema.omit({ deliverableId: true }),
    success: 200,
  },
  'content.list': {
    method: 'GET',
    path: '/api/v1/content',
    summary: 'List project content items scheduled in a date range.',
    success: 200,
  },
  'content.create': {
    method: 'POST',
    path: '/api/v1/content',
    summary: 'Create a content calendar draft or scheduled item.',
    body: createContentItemSchema,
    success: 201,
  },
  'content.update': {
    method: 'PATCH',
    path: '/api/v1/content/:id',
    summary: 'Update a project content item while it is still at expectedUpdatedAt.',
    body: updateContentItemSchema.omit({ contentItemId: true }),
    success: 200,
  },
  'invitations.create': {
    method: 'POST',
    path: '/api/v1/invitations',
    summary: 'Invite a person by email; returns the one-time invitation link. Owners and managers only.',
    body: inviteMemberSchema,
    success: 201,
  },
  'invitations.resend': {
    method: 'POST',
    path: '/api/v1/invitations/:id/resend',
    summary: 'Replace an invitation with a fresh link and revoke the old one.',
    success: 200,
  },
  'invitations.revoke': {
    method: 'DELETE',
    path: '/api/v1/invitations/:id',
    summary: 'Revoke a pending invitation.',
    success: 200,
  },
  'members.update': {
    method: 'PATCH',
    path: '/api/v1/members/:id',
    summary: 'Change a member’s role, active flag, groups and manager; the last active owner is kept.',
    body: saveMemberSchema.omit({ id: true }),
    success: 200,
  },
  'groups.create': {
    method: 'POST',
    path: '/api/v1/groups',
    summary: 'Create a group.',
    body: saveGroupSchema.omit({ id: true }),
    success: 201,
  },
  'groups.update': {
    method: 'PATCH',
    path: '/api/v1/groups/:id',
    summary: 'Rename a group.',
    body: saveGroupSchema.omit({ id: true }),
    success: 200,
  },
  ...CRM_CONTRACTS,
  ...EXTRA_CONTRACTS,
  ...EXPORT_CONTRACTS,
  ...BILLING_CONTRACTS,
  'groups.delete': { method: 'DELETE', path: '/api/v1/groups/:id', summary: 'Delete a group.', success: 200 },
} as const satisfies Readonly<Record<string, ApiContract>>

/** A contract id. */
export type ContractId = keyof typeof API_CONTRACTS

/** One endpoint as `GET /api/v1` and the OpenAPI document describe it. */
export interface ApiIndexEntry {
  readonly id: string
  readonly method: string
  readonly path: string
  readonly summary: string
  readonly success: number
  readonly query?: readonly ApiQueryParam[]
  readonly returns?: 'csv' | 'file' | 'calendar'
  readonly upload?: boolean
  /** The JSON body as JSON Schema. */
  readonly body?: Readonly<Record<string, unknown>>
}

/** The API index served by `GET /api/v1`: every contract with its body as JSON Schema. */
export function apiIndex(): readonly ApiIndexEntry[] {
  return Object.entries(API_CONTRACTS).map(([id, contract]: [string, ApiContract]) => ({
    id,
    method: contract.method,
    path: contract.path,
    summary: contract.summary,
    success: contract.success,
    ...((contract.query ?? listQuery(id)) === undefined ? {} : { query: contract.query ?? listQuery(id) }),
    ...(contract.returns === undefined ? {} : { returns: contract.returns }),
    ...(contract.upload === true ? { upload: true } : {}),
    ...(contract.bodyJson === undefined ? {} : { body: contract.bodyJson }),
    ...(contract.body === undefined
      ? {}
      : { body: z.toJSONSchema(contract.body, { io: 'input', unrepresentable: 'any' }) }),
  }))
}

type BodyOf<I extends ContractId> = (typeof API_CONTRACTS)[I] extends { readonly body: infer S extends z.ZodType }
  ? z.output<S>
  : never

/** Reads a request body and validates it against the contract's schema. */
export function contractBody<I extends ContractId>(request: Request, id: I): Promise<Result<BodyOf<I>>> {
  const contract: ApiContract = API_CONTRACTS[id]
  if (contract.body === undefined) throw new Error(`contract ${id} has no body`)
  return readBody(request, contract.body as BodySchema<BodyOf<I>>)
}
