'use client'

import { Button } from '@ops/ui/components/ui/button'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TASK_RESPONSIBILITY_COPY } from '../../../../i18n/task-responsibility-copy'
import { saveTaskPatch, type TaskResponsibilityProps } from './task-responsibility-shared'

function BlockerFields({
  reason,
  waitingOn,
  people,
  copy,
  onReason,
  onWaitingOn,
}: Readonly<{
  reason: string
  waitingOn: string
  people: TaskResponsibilityProps['people']
  copy: (typeof TASK_RESPONSIBILITY_COPY)['en']
  onReason: (value: string) => void
  onWaitingOn: (value: string) => void
}>) {
  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium">
        {copy.reason}
        <Textarea
          value={reason}
          rows={2}
          maxLength={1000}
          onChange={(event) => {
            onReason(event.target.value)
          }}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        {copy.waitingOn}
        <NativeSelect
          value={waitingOn}
          onChange={(event) => {
            onWaitingOn(event.target.value)
          }}
          className="w-full font-normal"
        >
          <option value="">{copy.nobody}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </NativeSelect>
      </label>
    </>
  )
}

export function TaskBlockerSection({
  taskId,
  updatedAt,
  people,
  locale,
  blockedReason,
  waitingOnId,
}: TaskResponsibilityProps &
  Readonly<{
    blockedReason: string | null
    waitingOnId: string | null
  }>) {
  const copy = TASK_RESPONSIBILITY_COPY[locale]
  const router = useRouter()
  const [reason, setReason] = useState(blockedReason ?? '')
  const [waitingOn, setWaitingOn] = useState(waitingOnId ?? '')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function save(patch: Record<string, unknown>) {
    if (pending) return
    setPending(true)
    setFailed(false)
    const ok = await saveTaskPatch({ taskId, updatedAt, patch })
    if (ok) router.refresh()
    else setFailed(true)
    setPending(false)
  }

  return (
    <details>
      <summary className="cursor-pointer text-sm text-muted-foreground">
        {blockedReason ? copy.blocked : copy.markBlocked}
      </summary>
      <div className="mt-3 grid gap-3">
        <BlockerFields
          reason={reason}
          waitingOn={waitingOn}
          people={people}
          copy={copy}
          onReason={setReason}
          onWaitingOn={setWaitingOn}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || reason.trim() === ''}
            onClick={() => {
              void save({ blockedReason: reason.trim(), waitingOnId: waitingOn || null })
            }}
          >
            {copy.saveBlocker}
          </Button>
          {blockedReason ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setReason('')
                setWaitingOn('')
                void save({ blockedReason: null, waitingOnId: null })
              }}
            >
              {copy.unblock}
            </Button>
          ) : null}
        </div>
        {failed ? (
          <p role="alert" className="text-xs text-destructive">
            {copy.failed}
          </p>
        ) : null}
      </div>
    </details>
  )
}
