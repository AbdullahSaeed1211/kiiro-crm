'use client'
/* eslint-disable @typescript-eslint/no-confusing-void-expression */

import { useState, type SyntheticEvent } from 'react'

interface Result {
  readonly ok: boolean
  readonly error?: string
  readonly data?: unknown
}
type InviteAction = (input: unknown) => Promise<Result>
type GroupAction = (input: unknown) => Promise<Result>

export function InviteMemberForm({ action }: Readonly<{ action: InviteAction }>) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [message, setMessage] = useState<string>()
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await action({ email, role })
    const token =
      typeof result.data === 'object' && result.data !== null && 'token' in result.data ? result.data.token : ''
    setMessage(result.ok ? `Invitation created. Share /invite/${String(token)} with the teammate.` : result.error)
  }
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <input
        className="h-10 rounded-md border px-3"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="teammate@example.com"
        required
        type="email"
        value={email}
      />
      <select className="h-10 rounded-md border px-3" onChange={(event) => setRole(event.target.value)} value={role}>
        <option value="staff">Staff</option>
        <option value="manager">Manager</option>
        <option value="owner">Owner</option>
      </select>
      <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
        Invite
      </button>
      {message !== undefined && (
        <p className="text-sm text-muted-foreground sm:col-span-3" role="status">
          {message}
        </p>
      )}
    </form>
  )
}

export function GroupForm({ action }: Readonly<{ action: GroupAction }>) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string>()
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await action({ name })
    setMessage(result.ok ? 'Group saved.' : result.error)
  }
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto]"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <input
        className="h-10 rounded-md border px-3"
        onChange={(event) => setName(event.target.value)}
        placeholder="Sales"
        required
        value={name}
      />
      <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
        Create group
      </button>
      {message !== undefined && (
        <p className="text-sm text-muted-foreground sm:col-span-2" role="status">
          {message}
        </p>
      )}
    </form>
  )
}
