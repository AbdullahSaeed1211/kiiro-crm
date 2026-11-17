'use client'

import type { VoiceNumber, VoiceSnapshot } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import { Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CallingCopy } from '../../../i18n/calling-copy'

function suitableNumber({
  numbers,
  selectedId,
}: Readonly<{ numbers: readonly VoiceNumber[]; selectedId: string }>): VoiceNumber | undefined {
  return (
    numbers.find((number) => number.id === selectedId && number.status === 'active' && number.outboundEnabled) ??
    numbers.find((number) => number.status === 'active' && number.outboundEnabled)
  )
}

function selectedNumberId(numberId: string, available: readonly VoiceNumber[]): string {
  return numberId || (available.length === 1 ? available[0].id : '')
}

function canStartCall({
  snapshot,
  selected,
  phone,
  tabAvailable,
  pending,
}: Readonly<{
  snapshot: VoiceSnapshot
  selected: VoiceNumber | undefined
  phone: string
  tabAvailable: boolean
  pending: boolean
}>): boolean {
  return (
    snapshot.configured &&
    snapshot.mode !== 'disabled' &&
    selected !== undefined &&
    phone.trim() !== '' &&
    tabAvailable &&
    !pending
  )
}

export function DialerForm({
  snapshot,
  draft,
  copy,
  tabAvailable,
  pending,
  onCall,
}: Readonly<{
  snapshot: VoiceSnapshot
  draft: { number?: string; leadId?: string; leadName?: string }
  copy: CallingCopy
  tabAvailable: boolean
  pending: boolean
  onCall: (input: { phone: string; numberId: string; leadId?: string }) => void
}>) {
  const available = snapshot.numbers.filter((number) => number.status === 'active' && number.outboundEnabled)
  const [phone, setPhone] = useState(draft.number ?? '')
  const [numberId, setNumberId] = useState('')
  useEffect(() => {
    if (draft.number !== undefined) setPhone(draft.number)
  }, [draft.number])
  useEffect(() => {
    if (numberId === '' && available.length === 1) setNumberId(available[0].id)
  }, [available, numberId])
  const selected = suitableNumber({ numbers: available, selectedId: numberId })
  const canCall = canStartCall({ snapshot, selected, phone, tabAvailable, pending })
  return (
    <div className="space-y-4">
      <PhoneField phone={phone} label={copy.number} onChange={setPhone} />
      <NumberSelect
        numbers={available}
        selected={selectedNumberId(numberId, available)}
        copy={copy}
        onChange={setNumberId}
      />
      <NumberAvailability available={available.length > 0} canManage={snapshot.canManage} copy={copy} />
      <LeadName name={draft.leadName} />
      <DialPad
        label={copy.keypad}
        onDigit={(digit) => {
          setPhone((value) => `${value}${digit}`)
        }}
      />
      <DialButton
        disabled={!canCall}
        pending={pending}
        copy={copy}
        onCall={() => {
          startCall({ selected, phone, draft, onCall })
        }}
      />
      <TabWarning available={tabAvailable} message={copy.anotherTab} />
    </div>
  )
}

function startCall({
  selected,
  phone,
  draft,
  onCall,
}: Readonly<{
  selected: VoiceNumber | undefined
  phone: string
  draft: { number?: string; leadId?: string; leadName?: string }
  onCall: (input: { phone: string; numberId: string; leadId?: string }) => void
}>) {
  if (selected === undefined) return
  onCall({ phone: phone.trim(), numberId: selected.id, leadId: draft.leadId })
}

function PhoneField({
  phone,
  label,
  onChange,
}: Readonly<{ phone: string; label: string; onChange: (value: string) => void }>) {
  return (
    <div className="space-y-2">
      <label htmlFor="voice-number" className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        id="voice-number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        value={phone}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder="+1 212 555 0100"
      />
    </div>
  )
}

function NumberSelect({
  numbers,
  selected,
  copy,
  onChange,
}: Readonly<{
  numbers: readonly VoiceNumber[]
  selected: string
  copy: CallingCopy
  onChange: (value: string) => void
}>) {
  if (numbers.length === 0) return null
  const selectedNumber = numbers.find((number) => number.id === selected)
  const selectedLabel = selectedNumber === undefined ? undefined : numberLabel(selectedNumber)
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground" htmlFor="voice-from">
        {copy.from}
      </label>
      <Select
        value={selected}
        onValueChange={(value) => {
          onChange(value ?? '')
        }}
      >
        <SelectTrigger id="voice-from" className="w-full">
          <SelectValue placeholder={copy.from}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {numbers.map((number) => (
            <SelectItem value={number.id} key={number.id}>
              {numberLabel(number)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function numberLabel(number: VoiceNumber): string {
  return number.label ? `${number.label} · ${number.e164}` : number.e164
}

function NumberAvailability({
  available,
  canManage,
  copy,
}: Readonly<{ available: boolean; canManage: boolean; copy: CallingCopy }>) {
  if (available) return null
  return <p className="text-sm text-muted-foreground">{canManage ? copy.noNumber : copy.noAssignedNumber}</p>
}

function LeadName({ name }: Readonly<{ name?: string }>) {
  if (name === undefined) return null
  return <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{name}</p>
}

function TabWarning({ available, message }: Readonly<{ available: boolean; message: string }>) {
  if (available) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

function DialPad({ label, onDigit }: Readonly<{ label: string; onDigit: (digit: string) => void }>) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label={label}>
      {'123456789*0#'.split('').map((digit) => (
        <Button
          key={digit}
          type="button"
          variant="outline"
          className="h-11 text-lg tabular-nums"
          onClick={() => {
            onDigit(digit)
          }}
        >
          {digit}
        </Button>
      ))}
    </div>
  )
}

function DialButton({
  disabled,
  pending,
  copy,
  onCall,
}: Readonly<{ disabled: boolean; pending: boolean; copy: CallingCopy; onCall: () => void }>) {
  return (
    <Button className="w-full" disabled={disabled} onClick={onCall}>
      <Phone aria-hidden />
      {pending ? copy.connecting : copy.call}
    </Button>
  )
}
