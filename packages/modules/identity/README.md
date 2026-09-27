# @ops/module-identity

## Purpose

Membership: invitations, member access (role, active flag, groups, manager) and groups.

## Public API

The module exports the commands `inviteMember`, `resendInvitation`, `revokeInvitation`, `saveMember`, `saveGroup` and `deleteGroup`, their zod schemas, and the `IdentityRepository` and `IdentityDeps` ports. Server actions in `apps/web/src/server/actions/settings/members.ts` and the `/api/v1/invitations`, `/api/v1/members` and `/api/v1/groups` routes call them.

## Ports

- `IdentityRepository`: member and invitation lookups, invitation creation and revocation, member access updates and group writes. Writes the store rejects come back as failures.
- `IdentityDeps.newToken`: returns a random invitation token and its SHA-256 hash; only the hash is stored.

## Invariants

- Only owners and managers act; `can(actor, 'manage_members', { role })` decides which roles each may invite, manage and assign, so a manager cannot make an owner.
- An email that belongs to a member, or has a pending invitation, cannot be invited again.
- Resending issues a new link and revokes the old one; accepted invitations cannot be resent.
- A member cannot deactivate their own account. The Payload `protectLastActiveOwner` hook keeps the last active owner, and its 409 comes back as `CONFLICT`.
