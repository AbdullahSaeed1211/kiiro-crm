'use client'

import type { VoiceNumber, VoiceSnapshot } from '@ops/module-crm'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ops/ui/components/ui/table'
import { UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CallingCopy } from '../../../../i18n/calling-copy'
import {
  NumberActionsCell,
  NumberAssigneeCell,
  NumberCapabilitiesCell,
  NumberIdentityCell,
  NumberPriceCell,
  NumberStatusCell,
} from './number-table-cells'
type Copy = CallingCopy

export function NumberTable({
  snapshot,
  copy,
  onSave,
  onRelease,
}: Readonly<{
  snapshot: VoiceSnapshot
  copy: Copy
  onSave: (number: VoiceNumber) => Promise<void>
  onRelease: (number: VoiceNumber) => Promise<void>
}>) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{copy.number}</TableHead>
            <TableHead>{copy.active}</TableHead>
            <TableHead>
              {copy.inbound} / {copy.outbound}
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1">
                <UsersRound aria-hidden className="size-3" />
                {copy.assignedPeople}
              </span>
            </TableHead>
            <TableHead>{copy.monthly}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshot.numbers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                {copy.noNumber}
              </TableCell>
            </TableRow>
          ) : (
            snapshot.numbers.map((number) => (
              <NumberRow
                key={number.id}
                number={number}
                members={snapshot.members}
                copy={copy}
                onSave={onSave}
                onRelease={onRelease}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function NumberRow({
  number,
  members,
  copy,
  onSave,
  onRelease,
}: Readonly<{
  number: VoiceNumber
  members: VoiceSnapshot['members']
  copy: Copy
  onSave: (number: VoiceNumber) => Promise<void>
  onRelease: (number: VoiceNumber) => Promise<void>
}>) {
  const [label, setLabel] = useState(number.label)
  const [assigneeIds, setAssigneeIds] = useState(number.assigneeIds)
  const [inboundEnabled, setInboundEnabled] = useState(number.inboundEnabled)
  const [outboundEnabled, setOutboundEnabled] = useState(number.outboundEnabled)
  const [recordingEnabled, setRecordingEnabled] = useState(number.recordingEnabled)
  const [pending, setPending] = useState(false)
  const [confirmRelease, setConfirmRelease] = useState(false)
  useEffect(() => {
    setLabel(number.label)
    setAssigneeIds(number.assigneeIds)
    setInboundEnabled(number.inboundEnabled)
    setOutboundEnabled(number.outboundEnabled)
    setRecordingEnabled(number.recordingEnabled)
  }, [number])
  const save = async () => {
    setPending(true)
    try {
      await onSave({ ...number, label, assigneeIds, inboundEnabled, outboundEnabled, recordingEnabled })
    } finally {
      setPending(false)
    }
  }
  return (
    <TableRow>
      <NumberIdentityCell number={number} label={label} copy={copy} onChange={setLabel} />
      <NumberStatusCell number={number} copy={copy} />
      <NumberCapabilitiesCell
        copy={copy}
        inboundEnabled={inboundEnabled}
        outboundEnabled={outboundEnabled}
        recordingEnabled={recordingEnabled}
        setInboundEnabled={setInboundEnabled}
        setOutboundEnabled={setOutboundEnabled}
        setRecordingEnabled={setRecordingEnabled}
      />
      <NumberAssigneeCell members={members} assigneeIds={assigneeIds} setAssigneeIds={setAssigneeIds} />
      <NumberPriceCell number={number} copy={copy} />
      <NumberActionsCell
        number={number}
        copy={copy}
        pending={pending}
        confirmRelease={confirmRelease}
        setConfirmRelease={setConfirmRelease}
        setPending={setPending}
        onSave={save}
        onRelease={onRelease}
      />
    </TableRow>
  )
}
