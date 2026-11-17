'use client'

import type { VoiceNumber, VoiceSnapshot } from '@ops/module-crm'
import { Badge } from '@ops/ui/components/ui/badge'
import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { TableCell } from '@ops/ui/components/ui/table'
import type { Dispatch, SetStateAction } from 'react'
import type { CallingCopy } from '../../../../i18n/calling-copy'
import { price, statusLabel, updateAssignmentIds } from './calling-settings-utils'
import { ReleaseDialog } from './release-dialog'
import { AssigneeList } from './settings-assignee-list'

type Copy = CallingCopy

export function NumberIdentityCell({
  number,
  label,
  copy,
  onChange,
}: Readonly<{
  number: VoiceNumber
  label: string
  copy: Copy
  onChange: (value: string) => void
}>) {
  return (
    <TableCell className="font-medium">
      <div>{number.e164}</div>
      <Input
        className="mt-1 h-7 max-w-48"
        aria-label={copy.label}
        value={label}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={copy.label}
      />
    </TableCell>
  )
}

export function NumberStatusCell({ number, copy }: Readonly<{ number: VoiceNumber; copy: Copy }>) {
  return (
    <TableCell>
      <Badge variant={number.status === 'active' ? 'secondary' : 'outline'}>{statusLabel(number, copy)}</Badge>
    </TableCell>
  )
}

export function NumberCapabilitiesCell({
  copy,
  inboundEnabled,
  outboundEnabled,
  recordingEnabled,
  setInboundEnabled,
  setOutboundEnabled,
  setRecordingEnabled,
}: Readonly<{
  copy: Copy
  inboundEnabled: boolean
  outboundEnabled: boolean
  recordingEnabled: boolean
  setInboundEnabled: (enabled: boolean) => void
  setOutboundEnabled: (enabled: boolean) => void
  setRecordingEnabled: (enabled: boolean) => void
}>) {
  return (
    <TableCell>
      <div className="space-y-2 text-xs">
        <CapabilityCheckbox checked={inboundEnabled} onChange={setInboundEnabled} label={copy.inbound} />
        <CapabilityCheckbox checked={outboundEnabled} onChange={setOutboundEnabled} label={copy.outbound} />
        <CapabilityCheckbox checked={recordingEnabled} onChange={setRecordingEnabled} label={copy.recordings} />
      </div>
    </TableCell>
  )
}

function CapabilityCheckbox({
  checked,
  onChange,
  label,
}: Readonly<{
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}>) {
  return (
    <label className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  )
}

export function NumberAssigneeCell({
  members,
  assigneeIds,
  setAssigneeIds,
}: Readonly<{
  members: VoiceSnapshot['members']
  assigneeIds: string[]
  setAssigneeIds: Dispatch<SetStateAction<string[]>>
}>) {
  return (
    <TableCell className="min-w-48">
      <AssigneeList
        members={members}
        selected={assigneeIds}
        onChange={({ memberId, operation }) => {
          setAssigneeIds((current) => updateAssignmentIds({ current, memberId, operation }))
        }}
      />
    </TableCell>
  )
}

export function NumberPriceCell({ number, copy }: Readonly<{ number: VoiceNumber; copy: Copy }>) {
  return (
    <TableCell className="whitespace-nowrap text-xs">
      {price(number.monthlyCost)}
      <br />
      <span className="text-muted-foreground">
        {price(number.setupCost)} {copy.setup.toLowerCase()}
      </span>
    </TableCell>
  )
}

export function NumberActionsCell({
  number,
  copy,
  pending,
  confirmRelease,
  setConfirmRelease,
  setPending,
  onSave,
  onRelease,
}: Readonly<{
  number: VoiceNumber
  copy: Copy
  pending: boolean
  confirmRelease: boolean
  setConfirmRelease: (open: boolean) => void
  setPending: (pending: boolean) => void
  onSave: () => Promise<void>
  onRelease: (number: VoiceNumber) => Promise<void>
}>) {
  return (
    <TableCell>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => void onSave()}>
          {copy.save}
        </Button>
        {number.status === 'active' ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setConfirmRelease(true)
            }}
          >
            {copy.release}
          </Button>
        ) : null}
      </div>
      <ReleaseDialog
        number={number}
        open={confirmRelease}
        pending={pending}
        copy={copy}
        onOpenChange={setConfirmRelease}
        onRelease={onRelease}
        setPending={setPending}
      />
    </TableCell>
  )
}
