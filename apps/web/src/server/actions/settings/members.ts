'use server'
/* eslint-disable complexity, max-statements -- invitation workflows keep authorization, duplicate checks, and token rotation atomic. */

import { revalidatePath } from 'next/cache'
import { can, type Role } from '@ops/platform'
import { payloadData, type UntypedPayload } from '../../auth/api'
import { requireRole, type ProductContext } from '../../auth/context'
import type { ActionResult } from './index'

const MEMBERS_SETTINGS_PATH = '/settings/members'
const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

async function createInvitation({
  dataPayload,
  context,
  email,
  role,
}: Readonly<{ dataPayload: UntypedPayload; context: ProductContext; email: string; role: Role }>): Promise<string> {
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  await dataPayload.create({
    collection: 'invitations',
    data: { tokenHash, email, role, status: 'pending', invitedBy: context.actor.id, expiresAt: Date.now() + 604800000 },
    overrideAccess: true,
    req: context.req,
  })
  return token
}

export async function inviteMember(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const dataPayload = payloadData(context.payload)
  const data = recordOf(input)
  const email = stringValue(data.email)?.toLowerCase()
  const role = stringValue(data.role) as Role | undefined
  if (email === undefined || role === undefined || !['owner', 'manager', 'staff'].includes(role))
    return { ok: false, error: 'Email and a valid role are required.' }
  if (!can(context.actor, 'manage_members', { type: 'users', role }))
    return { ok: false, error: 'You cannot invite this role.' }
  try {
    const existing = await dataPayload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req: context.req,
    })
    if (existing.docs.length > 0) return { ok: false, error: 'An active member already uses this email.' }
    const pending = await dataPayload.find({
      collection: 'invitations',
      where: { and: [{ email: { equals: email } }, { status: { equals: 'pending' } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req: context.req,
    })
    if (pending.docs.length > 0) return { ok: false, error: 'A pending invitation already exists for this email.' }
    const token = await createInvitation({ dataPayload, context, email, role })
    revalidatePath(MEMBERS_SETTINGS_PATH)
    const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
    return { ok: true, data: { token, inviteUrl: `${origin.replace(/\/$/u, '')}/invite/${token}` } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to create invitation.' }
  }
}

export async function revokeInvitation(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return { ok: false, error: 'Invitation id is required.' }
  try {
    await context.payload.update({
      collection: 'invitations',
      id,
      data: { status: 'revoked' },
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath(MEMBERS_SETTINGS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to revoke invitation.' }
  }
}

export async function resendInvitation(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return { ok: false, error: 'Invitation id is required.' }
  try {
    const found = await context.payload.find({
      collection: 'invitations',
      where: { id: { equals: id } },
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req: context.req,
    })
    const invitation = found.docs.at(0)
    if (invitation === undefined) return { ok: false, error: 'Invitation not found.' }
    if (invitation.status === 'accepted' || invitation.status === 'accepting')
      return { ok: false, error: 'This invitation has already been accepted.' }
    if (!can(context.actor, 'manage_members', { type: 'users', role: invitation.role }))
      return { ok: false, error: 'You cannot resend this invitation.' }
    const token = await createInvitation({
      dataPayload: payloadData(context.payload),
      context,
      email: invitation.email.toLowerCase(),
      role: invitation.role,
    })
    await context.payload.update({
      collection: 'invitations',
      id,
      data: { status: 'revoked' },
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath(MEMBERS_SETTINGS_PATH)
    const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
    return { ok: true, data: { inviteUrl: `${origin.replace(/\/$/u, '')}/invite/${token}` } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to resend invitation.' }
  }
}

function memberUpdateInput(data: Record<string, unknown>):
  | {
      readonly id: string
      readonly role: Role
      readonly active: boolean
      readonly groups: string[]
      readonly reportsTo: string | null
    }
  | ActionResult {
  const id = stringValue(data.id)
  const role = stringValue(data.role) as Role | undefined
  if (id === undefined || role === undefined || !isRole(role))
    return { ok: false, error: 'Member and role are required.' }
  return {
    id,
    role,
    active: booleanValue(data.active),
    groups: stringArray(data.groups),
    reportsTo: nullableString(data.reportsTo),
  }
}
const booleanValue = (value: unknown): boolean => value === true || value === 'true'
const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
const nullableString = (value: unknown): string | null =>
  value === null || value === '' ? null : (stringValue(value) ?? null)
const isRole = (value: string): value is Role => value === 'owner' || value === 'manager' || value === 'staff'

async function loadManagedMember(context: ProductContext, id: string) {
  const found = await context.payload.find({
    collection: 'users',
    where: { id: { equals: id } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const member = found.docs.at(0)
  if (member === undefined || typeof member.role !== 'string') return { ok: false as const, error: 'Member not found.' }
  if (!can(context.actor, 'manage_members', { type: 'users', role: member.role }))
    return { ok: false as const, error: 'You cannot manage this member.' }
  return { ok: true as const, member }
}

export async function saveMember(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const parsed = memberUpdateInput(recordOf(input))
  if ('ok' in parsed) return parsed
  if (parsed.id === context.actor.id && !parsed.active)
    return { ok: false, error: 'You cannot deactivate your own account.' }
  try {
    const managed = await loadManagedMember(context, parsed.id)
    if (!managed.ok) return managed
    if (!can(context.actor, 'manage_members', { type: 'users', role: parsed.role }))
      return { ok: false, error: 'You cannot assign this role.' }
    await context.payload.update({
      collection: 'users',
      id: parsed.id,
      data: { role: parsed.role, active: parsed.active, groups: parsed.groups, reportsTo: parsed.reportsTo },
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath(MEMBERS_SETTINGS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to update member access.' }
  }
}

export async function saveGroup(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const name = stringValue(recordOf(input).name)
  if (name === undefined) return { ok: false, error: 'Group name is required.' }
  try {
    const data = recordOf(input)
    if (typeof data.id === 'string' && data.id !== '')
      await context.payload.update({ collection: 'groups', id: data.id, data: { name }, req: context.req })
    else await context.payload.create({ collection: 'groups', data: { name }, req: context.req })
    revalidatePath('/settings/groups')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save group.' }
  }
}

export async function deleteGroup(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return { ok: false, error: 'Group id is required.' }
  try {
    await context.payload.delete({ collection: 'groups', id, req: context.req })
    revalidatePath('/settings/groups')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to delete group.' }
  }
}
