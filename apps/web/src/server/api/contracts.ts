import {
  createProjectSchema,
  createTaskSchema,
  expectedVersionSchema,
  moveTaskSchema,
  projectMemberSchema,
  taskDatesSchema,
  updateProjectSchema,
  updateTaskSchema,
} from '@ops/module-work'
import { inviteMemberSchema, saveGroupSchema, saveMemberSchema } from '@ops/module-identity'
import type { Result } from '@ops/kernel'
import { z } from 'zod'
import { readBody, type BodySchema } from './http'
import type { ApiContract, ApiQueryParam } from './contract-types'
import { CRM_CONTRACTS } from './contracts-crm'
import { EXPORT_CONTRACTS } from './contracts-export'
import { EXTRA_CONTRACTS, listQuery } from './contracts-extra'

/** One endpoint of the product API: the single source for its route, its body validation and `GET /api/v1`. */

/** The product API, keyed by a stable contract id. */
const API_CONTRACTS = {
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
  'projects.list': {
    method: 'GET',
    path: '/api/v1/projects',
    summary: 'Projects you can see, by name; ?page=&limit= (max 100).',
    success: 200,
  },
  'projects.get': { method: 'GET', path: '/api/v1/projects/:id', summary: 'One project.', success: 200 },
  'projects.create': {
    method: 'POST',
    path: '/api/v1/projects',
    summary: 'Create a project; you own it unless ownerId says otherwise.',
    body: createProjectSchema,
    success: 201,
  },
  'projects.update': {
    method: 'PATCH',
    path: '/api/v1/projects/:id',
    summary: 'Change editable project fields while the project is still at expectedUpdatedAt.',
    body: updateProjectSchema.omit({ projectId: true }),
    success: 200,
  },
  'projects.members.add': {
    method: 'POST',
    path: '/api/v1/projects/:id/members',
    summary: 'Add a member to a project.',
    body: projectMemberSchema,
    success: 201,
  },
  'projects.members.remove': {
    method: 'DELETE',
    path: '/api/v1/projects/:id/members/:memberId',
    summary: 'Remove a member from a project.',
    body: expectedVersionSchema,
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
