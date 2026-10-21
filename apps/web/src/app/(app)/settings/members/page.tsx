import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import {
  inviteMember,
  resendInvitation,
  revokeInvitation,
  saveMember,
} from '../../../../server/actions/settings/members'
import { InviteMemberForm, InvitationActions, MemberActions } from '../member-forms'
import { ResetTwoFactorButton } from './reset-two-factor-button'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { getWorkspaceSettings, requireRole } from '../../../../server/auth/context'
import { can } from '@ops/platform'
import { formatDate } from '../../../../i18n/format'
import { normalizeLocale } from '../../../../i18n/config'
import { settingText } from '../../../../i18n/settings-form-copy'
import type { Role, WorkProfile } from '@ops/platform'

export const metadata: Metadata = { title: 'Members' }
export const dynamic = 'force-dynamic'

type AccessRow = Readonly<{
  id: string
  name: string
  email: string
  role: string
  workProfile: WorkProfile
  status: string
  locale: 'en' | 'es'
  lastInvitation: string
  actions?: ReactNode
}>

function workProfileName(profile: WorkProfile): string {
  const names: Readonly<Record<WorkProfile, string>> = {
    sales: 'Sales',
    delivery: 'Delivery',
    consultant: 'Consultant',
  }
  return names[profile]
}

function memberWorkProfile(profile: unknown): WorkProfile {
  return profile === 'sales' || profile === 'consultant' ? profile : 'delivery'
}

function roleName(role: string): string {
  return role === 'manager' ? 'Admin' : role
}

type MemberAccessFormValue = Parameters<typeof MemberActions>[0]['member']

function memberActions(
  input: Readonly<{
    canManage: boolean
    isOwner: boolean
    id: string
    name: string
    member: MemberAccessFormValue
    groups: readonly { id: string; name: string }[]
    reports: readonly { id: string; name: string }[]
    roles: readonly Role[]
    locale: 'en' | 'es'
  }>,
): ReactNode {
  if (!input.canManage)
    return <span className="text-xs text-muted-foreground">{settingText('Managed by role policy', input.locale)}</span>
  return (
    <>
      {input.isOwner ? <ResetTwoFactorButton userId={input.id} name={input.name} /> : null}
      <MemberActions
        action={saveMember}
        groups={input.groups}
        reports={input.reports}
        roles={input.roles}
        member={input.member}
      />
    </>
  )
}

function AccessCards({ rows }: Readonly<{ rows: readonly AccessRow[] }>) {
  return (
    <div className="grid gap-2 lg:hidden">
      {rows.map((row) => (
        <article className="rounded-lg border bg-card p-3" key={row.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{row.name}</h3>
              <p className="break-all text-xs text-muted-foreground">{row.email}</p>
            </div>
            <span className="shrink-0 text-xs capitalize text-muted-foreground">
              {settingText(roleName(row.role), row.locale)}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <dt>{settingText('Work area', row.locale)}</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {settingText(workProfileName(row.workProfile), row.locale)}
              </dd>
            </div>
            <div>
              <dt>{settingText('Status', row.locale)}</dt>
              <dd className="mt-0.5 text-sm capitalize text-foreground">{row.status}</dd>
            </div>
            <div>
              <dt>{settingText('Last invitation', row.locale)}</dt>
              <dd className="mt-0.5 text-sm text-foreground">{row.lastInvitation}</dd>
            </div>
          </dl>
          {row.actions === undefined ? null : <div className="mt-3 border-t pt-3">{row.actions}</div>}
        </article>
      ))}
    </div>
  )
}

function AccessTable({ rows, locale }: Readonly<{ rows: readonly AccessRow[]; locale: 'en' | 'es' }>) {
  return (
    <div className="hidden lg:block">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="w-[28%] py-2 pr-3">{settingText('Member', locale)}</th>
            <th className="w-[10%] py-2 pr-3">{settingText('Role', locale)}</th>
            <th className="w-[12%] py-2 pr-3">{settingText('Status', locale)}</th>
            <th className="w-[18%] py-2">{settingText('Last invitation', locale)}</th>
            <th className="w-[32%] py-2">{settingText('Actions', locale)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t" key={row.id}>
              <td className="break-words py-2 pr-3">
                <span className="block">{row.name}</span>
                <span className="block break-all text-xs text-muted-foreground">{row.email}</span>
              </td>
              <td className="break-words py-2 pr-3 capitalize">
                {settingText(roleName(row.role), row.locale)}
                <span className="block text-xs text-muted-foreground">
                  {settingText(workProfileName(row.workProfile), row.locale)}
                </span>
              </td>
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
    ...users.docs.map((user): AccessRow => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      locale,
      role: user.role,
      workProfile: memberWorkProfile(user.workProfile),
      status: user.active === true ? settingText('Active', locale) : settingText('Inactive', locale),
      lastInvitation: settingText('Not sent', locale),
      actions: memberActions({
        canManage: can(context.actor, 'manage_members', { type: 'users', role: user.role }),
        isOwner: context.actor.role === 'owner',
        id: user.id,
        name: user.name || user.email,
        groups: groupOptions,
        reports: reportOptions.filter((report) => report.id !== user.id),
        roles: context.actor.role === 'owner' ? ['staff', 'manager', 'owner'] : ['staff'],
        locale,
        member: {
          id: user.id,
          role: user.role,
          workProfile: memberWorkProfile(user.workProfile),
          active: user.active === true,
          groups: (user.groups ?? []).map((group) => (typeof group === 'string' ? group : group.id)),
          reportsTo: typeof user.reportsTo === 'string' ? user.reportsTo : '',
        },
      }),
    })),
    ...invitations.docs.map((invitation): AccessRow => ({
      id: invitation.id,
      name: invitation.email,
      email: invitation.email,
      locale,
      role: invitation.role,
      workProfile: memberWorkProfile(undefined),
      status: settingText(invitation.status, locale),
      lastInvitation:
        typeof invitation.createdAt === 'string'
          ? formatDate(new Date(invitation.createdAt), locale, {
              dateStyle: 'medium',
              timeZone,
            })
          : settingText('Not sent', locale),
      actions:
        invitation.status === 'accepted' || invitation.status === 'accepting' ? (
          <span className="text-xs text-muted-foreground">{settingText('No actions', locale)}</span>
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
          {settingText(
            'Workspace access changes are limited to owners and managers. Invitations can be resent while pending; revoking one immediately invalidates its link.',
            locale,
          )}
        </p>
        <InviteMemberForm action={inviteMember} />
        <div className="border-t pt-4">
          <AccessCards rows={rows} />
          <AccessTable rows={rows} locale={locale} />
        </div>
      </SettingsForm>
    </SettingsPage>
  )
}
