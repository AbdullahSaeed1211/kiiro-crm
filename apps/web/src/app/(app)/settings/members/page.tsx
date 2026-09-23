import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { inviteMember, resendInvitation, revokeInvitation, saveMember } from '../../../../server/actions/settings'
import { InviteMemberForm, InvitationActions, MemberActions } from '../member-forms'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { requireRole } from '../../../../server/auth/context'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { can } from '@ops/platform'
import { formatDate } from '../../../../i18n/format'
import { normalizeLocale } from '../../../../i18n/config'

export const metadata: Metadata = { title: 'Members' }
export const dynamic = 'force-dynamic'

type AccessRow = Readonly<{
  id: string
  name: string
  email: string
  role: string
  status: string
  lastInvitation: string
  actions?: ReactNode
}>

function AccessCards({ rows }: Readonly<{ rows: readonly AccessRow[] }>) {
  return (
    <div className="grid gap-2 md:hidden">
      {rows.map((row) => (
        <article className="rounded-lg border bg-card p-3" key={row.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{row.name}</h3>
              <p className="break-all text-xs text-muted-foreground">{row.email}</p>
            </div>
            <span className="shrink-0 text-xs capitalize text-muted-foreground">{row.role}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <dt>Status</dt>
              <dd className="mt-0.5 text-sm capitalize text-foreground">{row.status}</dd>
            </div>
            <div>
              <dt>Last invitation</dt>
              <dd className="mt-0.5 text-sm text-foreground">{row.lastInvitation}</dd>
            </div>
          </dl>
          {row.actions === undefined ? null : <div className="mt-3 border-t pt-3">{row.actions}</div>}
        </article>
      ))}
    </div>
  )
}

function AccessTable({ rows }: Readonly<{ rows: readonly AccessRow[] }>) {
  return (
    <div className="hidden overflow-hidden md:block">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="w-[34%] py-2 pr-3">Member</th>
            <th className="w-[12%] py-2 pr-3">Role</th>
            <th className="w-[14%] py-2 pr-3">Status</th>
            <th className="w-[22%] py-2">Last invitation</th>
            <th className="w-[18%] py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t" key={row.id}>
              <td className="break-words py-2 pr-3">
                <span className="block">{row.name}</span>
                <span className="block break-all text-xs text-muted-foreground">{row.email}</span>
              </td>
              <td className="break-words py-2 pr-3 capitalize">{row.role}</td>
              <td className="break-words py-2 pr-3 capitalize">{row.status}</td>
              <td className="break-words py-2 text-xs text-muted-foreground">{row.lastInvitation}</td>
              <td className="py-2 pl-3">{row.actions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// eslint-disable-next-line max-lines-per-function -- page assembles users, invitations, and responsive access controls.
export default async function MembersSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const [users, invitations, groups, settings] = await Promise.all([
    context.payload.find({
      collection: 'users',
      depth: 0,
      limit: 100,
      sort: 'name',
      overrideAccess: false,
      req: context.req,
    }),
    context.payload.find({
      collection: 'invitations',
      depth: 0,
      limit: 100,
      sort: '-createdAt',
      overrideAccess: false,
      req: context.req,
    }),
    context.payload.find({ collection: 'groups', depth: 0, limit: 100, sort: 'name', req: context.req }),
    getWorkspaceSettings(),
  ])
  const locale = normalizeLocale(settings.locale)
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const groupOptions = groups.docs.map((group) => ({ id: group.id, name: group.name }))
  const reportOptions = users.docs.map((user) => ({ id: user.id, name: user.name || user.email }))
  const rows: AccessRow[] = [
    ...users.docs.map((user) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: user.role,
      status: user.active === true ? 'Active' : 'Inactive',
      lastInvitation: 'Not sent',
      actions: can(context.actor, 'manage_members', { type: 'users', role: user.role }) ? (
        <MemberActions
          action={saveMember}
          groups={groupOptions}
          reports={reportOptions.filter((report) => report.id !== user.id)}
          member={{
            id: user.id,
            role: user.role,
            active: user.active === true,
            groups: (user.groups ?? []).map((group) => (typeof group === 'string' ? group : group.id)),
            reportsTo: typeof user.reportsTo === 'string' ? user.reportsTo : '',
          }}
        />
      ) : (
        <span className="text-xs text-muted-foreground">Managed by role policy</span>
      ),
    })),
    ...invitations.docs.map((invitation) => ({
      id: invitation.id,
      name: invitation.email,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      lastInvitation:
        typeof invitation.createdAt === 'string'
          ? formatDate(new Date(invitation.createdAt), locale, {
              dateStyle: 'medium',
              timeZone,
            })
          : 'Not sent',
      actions:
        invitation.status === 'accepted' || invitation.status === 'accepting' ? (
          <span className="text-xs text-muted-foreground">No actions</span>
        ) : (
          <InvitationActions
            id={invitation.id}
            resendAction={resendInvitation}
            revokeAction={revokeInvitation}
            canRevoke={invitation.status === 'pending'}
          />
        ),
    })),
  ]
  return (
    <SettingsPage
      title="Members"
      description="Invite teammates and review workspace access."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <p className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          Workspace access changes are limited to owners and managers. Invitations can be resent while pending; revoking
          one immediately invalidates its link.
        </p>
        <InviteMemberForm action={inviteMember} />
        <div className="border-t pt-4">
          <AccessCards rows={rows} />
          <AccessTable rows={rows} />
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
