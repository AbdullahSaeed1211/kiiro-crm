import type { FilterNode, Id } from '@ops/kernel'

/** Roles inside one tenant (decision D-27). */
export type Role = 'owner' | 'manager' | 'staff'

/** Capabilities checked by the policy (spec §9.10). */
export type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'convert'
  | 'manage_settings'
  | 'manage_members'
  | 'manage_workflows'
  | 'manage_intake'
  | 'admin_panel'

/** The authenticated user a request acts for; `reportIds` are transitive reports. */
export interface Actor {
  readonly id: Id
  readonly role: Role
  readonly groupIds: readonly Id[]
  readonly reportIds: readonly Id[]
  readonly active: boolean
}

/** The ownership facts the policy needs about a record, or only its type for create checks. */
export interface AccessResource {
  readonly type: string
  readonly ownerId?: Id
  readonly assigneeIds?: readonly Id[]
  readonly groupId?: Id
}

/** Pure permission check. */
export type Can = (actor: Actor, action: Action, resource: AccessResource) => boolean

/** Filter restricting a list query to what the actor may read; `undefined` means unrestricted. */
export type ScopeFilter = (actor: Actor, recordType: string) => FilterNode | undefined
