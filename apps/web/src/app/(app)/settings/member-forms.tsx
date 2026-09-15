/* eslint-disable max-lines, max-lines-per-function -- compact settings forms keep validation, pending state, and feedback together. */
'use client'

import { useState, type SyntheticEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@ops/ui/composites/ConfirmDialog'
import { CopyButton } from '../copy-button'

interface Result {
  readonly ok: boolean
  readonly error?: string
  readonly data?: unknown
}
type InviteAction = (input: unknown) => Promise<Result>
type GroupAction = (input: unknown) => Promise<Result>
type InvitationAction = (input: unknown) => Promise<Result>
type MemberAction = (input: unknown) => Promise<Result>

export function InvitationActions({
  id,
  resendAction,
  revokeAction,
  canRevoke = true,
}: Readonly<{ id: string; resendAction: InvitationAction; revokeAction: InvitationAction; canRevoke?: boolean }>) {
  const [pending, setPending] = useState<'resend' | 'revoke' | null>(null)
  const [message, setMessage] = useState<string>()
  const [inviteUrl, setInviteUrl] = useState('')
  const resend = async () => {
    setPending('resend')
    setMessage(undefined)
    setInviteUrl('')
    try {
      const result = await resendAction({ id })
      const data =
        typeof result.data === 'object' && result.data !== null ? (result.data as Record<string, unknown>) : {}
      setInviteUrl(typeof data.inviteUrl === 'string' ? data.inviteUrl : '')
      setMessage(result.ok ? 'Invitation resent.' : (result.error ?? 'Unable to resend invitation.'))
    } catch {
      setMessage('Unable to resend invitation. Try again.')
    } finally {
      setPending(null)
    }
  }
  const revoke = async () => {
    setPending('revoke')
    setMessage(undefined)
    try {
      const result = await revokeAction({ id })
      setMessage(result.ok ? 'Invitation revoked.' : (result.error ?? 'Unable to revoke invitation.'))
    } catch {
      setMessage('Unable to revoke invitation. Try again.')
    } finally {
      setPending(null)
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="text-xs font-medium text-primary hover:underline"
        type="button"
        disabled={pending !== null}
        onClick={() => void resend()}
      >
        {pending === 'resend' ? 'Resending…' : 'Resend'}
      </button>
      {canRevoke ? (
        <ConfirmDialog
          title="Revoke invitation?"
          description="This invitation link will stop working immediately."
          labels={{ cancel: 'Cancel', confirm: 'Revoke invitation', confirming: 'Revoking…' }}
          destructive
          onConfirm={revoke}
          trigger={
            <button
              className="text-xs font-medium text-destructive hover:underline"
              type="button"
              disabled={pending !== null}
            >
              {pending === 'revoke' ? 'Revoking…' : 'Revoke'}
            </button>
          }
        />
      ) : null}
      {message === undefined ? null : (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
          {inviteUrl === '' ? null : (
            <span className="ml-1 inline-flex items-center gap-1 break-all">
              {inviteUrl}
              <CopyButton value={inviteUrl} label="invitation link" />
            </span>
          )}
        </span>
      )}
    </div>
  )
}

export function InviteMemberForm({ action }: Readonly<{ action: InviteAction }>) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [message, setMessage] = useState<string>()
  const [inviteUrl, setInviteUrl] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setInviteUrl('')
    try {
      const result = await action({ email, role })
      const data =
        typeof result.data === 'object' && result.data !== null ? (result.data as Record<string, unknown>) : {}
      const nextInviteUrl = typeof data.inviteUrl === 'string' ? data.inviteUrl : ''
      setInviteUrl(nextInviteUrl)
      setMessage(result.ok ? 'Invitation created.' : (result.error ?? 'Unable to create invitation.'))
      if (result.ok) setEmail('')
    } catch {
      setMessage('Unable to create invitation. Try again.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <label className="sr-only" htmlFor="invite-member-email">
        Teammate email
      </label>
      <input
        id="invite-member-email"
        name="email"
        autoComplete="email"
        className="h-10 rounded-md border px-3"
        onChange={(event) => {
          setEmail(event.target.value)
        }}
        placeholder="teammate@example.com"
        required
        spellCheck={false}
        type="email"
        value={email}
        disabled={pending}
      />
      <label className="sr-only" htmlFor="invite-member-role">
        Member role
      </label>
      <select
        id="invite-member-role"
        name="role"
        autoComplete="off"
        className="h-10 rounded-md border px-3"
        onChange={(event) => {
          setRole(event.target.value)
        }}
        value={role}
        disabled={pending}
      >
        <option value="staff">Staff</option>
        <option value="manager">Manager</option>
        <option value="owner">Owner</option>
      </select>
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Inviting…' : 'Invite'}
      </button>
      {message !== undefined ? (
        <div className="text-sm text-muted-foreground sm:col-span-3" role="status" aria-live="polite">
          <span>{message}</span>
          {inviteUrl === '' ? null : (
            <span className="mt-1 flex items-center gap-1 break-all text-xs">
              {inviteUrl}
              <CopyButton value={inviteUrl} label="invitation link" />
            </span>
          )}
        </div>
      ) : null}
    </form>
  )
}

export function MemberActions({
  member,
  groups,
  reports,
  action,
}: Readonly<{
  member: { id: string; role: string; active: boolean; groups: readonly string[]; reportsTo: string }
  groups: readonly { id: string; name: string }[]
  reports: readonly { id: string; name: string }[]
  action: MemberAction
}>) {
  const [role, setRole] = useState(member.role)
  const [active, setActive] = useState(member.active)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([...member.groups])
  const [reportsTo, setReportsTo] = useState(member.reportsTo)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const save = async () => {
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action({ id: member.id, role, active, groups: selectedGroups, reportsTo })
      setMessage(result.ok ? 'Access saved.' : (result.error ?? 'Unable to save access.'))
    } catch {
      setMessage('Unable to save access. Try again.')
    } finally {
      setPending(false)
    }
  }
  return (
    <details className="max-w-sm">
      <summary className="cursor-pointer rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Edit access
      </summary>
      <div className="mt-3 grid gap-3 rounded-md border bg-muted/20 p-3 text-xs">
        <label className="grid gap-1">
          <span className="font-medium">Role</span>
          <select
            className="h-9 rounded-md border bg-background px-2 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={role}
            onChange={(event) => {
              setRole(event.target.value)
            }}
            disabled={pending}
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => {
              setActive(event.target.checked)
            }}
            disabled={pending}
          />
          <span className="font-medium">Account active</span>
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Groups</span>
          <select
            className="min-h-20 rounded-md border bg-background px-2 py-1 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            multiple
            value={selectedGroups}
            onChange={(event) => {
              setSelectedGroups(Array.from(event.target.selectedOptions, (option) => option.value))
            }}
            disabled={pending}
          >
            {groups.length === 0 ? <option disabled>No groups created yet</option> : null}
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Reports to</span>
          <select
            className="h-9 rounded-md border bg-background px-2 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={reportsTo}
            onChange={(event) => {
              setReportsTo(event.target.value)
            }}
            disabled={pending}
          >
            <option value="">No manager</option>
            {reports.map((report) => (
              <option key={report.id} value={report.id}>
                {report.name}
              </option>
            ))}
          </select>
        </label>
        {message === undefined ? null : (
          <span className="text-muted-foreground" role="status" aria-live="polite">
            {message}
          </span>
        )}
        <button
          className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          type="button"
          onClick={() => void save()}
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Save access'}
        </button>
      </div>
    </details>
  )
}

export function GroupForm({ action }: Readonly<{ action: GroupAction }>) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string>()
  const [pending, setPending] = useState(false)
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const result = await action({ name })
      setMessage(result.ok ? 'Group saved.' : (result.error ?? 'Unable to save group.'))
      if (result.ok) setName('')
    } catch {
      setMessage('Unable to save group. Try again.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto]"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <label className="sr-only" htmlFor="group-name">
        Group name
      </label>
      <input
        id="group-name"
        name="name"
        autoComplete="off"
        className="h-10 rounded-md border px-3"
        onChange={(event) => {
          setName(event.target.value)
        }}
        placeholder="Sales"
        required
        value={name}
        disabled={pending}
      />
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Saving…' : 'Create group'}
      </button>
      {message !== undefined && (
        <p className="text-sm text-muted-foreground sm:col-span-2" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  )
}

export function GroupList({
  groups,
  action,
  deleteAction,
}: Readonly<{
  groups: readonly { id: string; name: string }[]
  action: GroupAction
  deleteAction: GroupAction
}>) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const save = async (id: string) => {
    if (draft.trim() === '') return
    setPending(true)
    const result = await action({ id, name: draft.trim() })
    setMessage(result.ok ? 'Group saved.' : result.error)
    if (result.ok) {
      setEditing(null)
      router.refresh()
    }
    setPending(false)
  }
  const remove = async (group: { id: string; name: string }) => {
    if (!window.confirm(`Delete the “${group.name}” group?`)) return
    setPending(true)
    const result = await deleteAction({ id: group.id })
    setMessage(result.ok ? 'Group deleted.' : result.error)
    if (result.ok) router.refresh()
    setPending(false)
  }
  return (
    <div className="space-y-3 border-t pt-5">
      <div>
        <h2 className="text-sm font-semibold">Existing groups</h2>
        <p className="text-sm text-muted-foreground">Rename or remove teams without leaving this page.</p>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border" aria-label="Groups">
          {groups.map((group) => (
            <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm" key={group.id}>
              {editing === group.id ? (
                <input
                  className="h-9 min-w-48 flex-1 rounded-md border bg-background px-2"
                  aria-label="Group name"
                  maxLength={120}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value)
                  }}
                />
              ) : (
                <span className="font-medium">{group.name}</span>
              )}
              <span className="flex items-center gap-3">
                {editing === group.id ? (
                  <>
                    <button
                      className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        void save(group.id)
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="text-xs text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      type="button"
                      onClick={() => {
                        setEditing(null)
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="button"
                    onClick={() => {
                      setEditing(group.id)
                      setDraft(group.name)
                      setMessage(undefined)
                    }}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="text-xs text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  type="button"
                  disabled={pending || editing !== null}
                  onClick={() => {
                    void remove(group)
                  }}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
