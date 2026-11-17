'use client'

import { Button } from '@ops/ui/components/ui/button'
import type { VoiceSnapshot } from '@ops/module-crm'
import type { CallingCopy } from '../../../i18n/calling-copy'

export function PanelStatus({
  snapshot,
  copy,
  receiving,
  pending,
  activeCall,
  onToggle,
}: Readonly<{
  snapshot: VoiceSnapshot | null
  copy: CallingCopy
  receiving: boolean
  pending: boolean
  activeCall: boolean
  onToggle: () => void
}>) {
  if (snapshot === null) return <p className="py-8 text-center text-sm text-muted-foreground">{copy.connecting}</p>
  if (!snapshot.configured) return <SetupStatus snapshot={snapshot} copy={copy} />
  const canReceive =
    snapshot.settings.enabled &&
    snapshot.numbers.some(
      (number) => number.status === 'active' && number.inboundEnabled && number.assigneeIds.includes(snapshot.userId),
    )
  return (
    <ReceiveCallStatus
      canReceive={canReceive}
      canManage={snapshot.canManage}
      receiving={receiving}
      pending={pending}
      activeCall={activeCall}
      copy={copy}
      onToggle={onToggle}
    />
  )
}

function SetupStatus({ snapshot, copy }: Readonly<{ snapshot: VoiceSnapshot; copy: CallingCopy }>) {
  const message = snapshot.canManage ? copy.setupRequired : copy.unavailable
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground" role="status">
      {message}
    </div>
  )
}

function ReceiveCallStatus({
  canReceive,
  canManage,
  receiving,
  pending,
  activeCall,
  copy,
  onToggle,
}: Readonly<{
  canReceive: boolean
  canManage: boolean
  receiving: boolean
  pending: boolean
  activeCall: boolean
  copy: CallingCopy
  onToggle: () => void
}>) {
  if (!canReceive && !receiving) return <NoReceiveNumber canManage={canManage} copy={copy} />
  return (
    <ReceiveToggle receiving={receiving} pending={pending} activeCall={activeCall} copy={copy} onToggle={onToggle} />
  )
}

function NoReceiveNumber({ canManage, copy }: Readonly<{ canManage: boolean; copy: CallingCopy }>) {
  const message = canManage ? copy.noNumber : copy.noAssignedNumber
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  )
}

function ReceiveToggle({
  receiving,
  pending,
  activeCall,
  copy,
  onToggle,
}: Readonly<{
  receiving: boolean
  pending: boolean
  activeCall: boolean
  copy: CallingCopy
  onToggle: () => void
}>) {
  const label = receiving ? copy.stopReceivingCalls : copy.receiveCalls
  const status = receiving ? copy.receivingCalls : copy.notReceivingCalls
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2" role="status">
      <span className="text-sm text-muted-foreground">{status}</span>
      <Button
        size="sm"
        variant={receiving ? 'outline' : 'default'}
        disabled={pending || (receiving && activeCall)}
        onClick={onToggle}
      >
        {label}
      </Button>
    </div>
  )
}
