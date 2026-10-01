'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useState, useTransition } from 'react'
import { inviteMember } from '../../../server/actions/settings/members'

/** Invites a teammate for real: creates the invitation and shows the link to send them. */
export function TeamStep() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('manager')
  const [message, setMessage] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const invite = () => {
    startTransition(async () => {
      const result = await inviteMember({ email, role })
      if (result.ok) {
        setLink(result.data.inviteUrl)
        setMessage('Invitation created. Send them this link.')
        setEmail('')
      } else {
        setLink(null)
        setMessage(result.error.message)
      }
    })
  }
  return (
    <div className="grid max-w-md gap-2 text-sm">
      <p className="text-muted-foreground">
        Invite a teammate now, or skip and do it later under Settings, Members. Each person gets a link to set their own
        password.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Teammate email"
          type="email"
          placeholder="name@company.com"
          className="min-w-52 flex-1"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
          }}
        />
        <NativeSelect
          aria-label="Teammate role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value)
          }}
        >
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </NativeSelect>
        <Button variant="outline" size="sm" disabled={pending || email.trim() === ''} onClick={invite}>
          Invite
        </Button>
      </div>
      {message === null ? null : <p role="status">{message}</p>}
      {link === null ? null : (
        <Input readOnly aria-label="Invitation link" className="font-mono text-xs" value={link} />
      )}
    </div>
  )
}
