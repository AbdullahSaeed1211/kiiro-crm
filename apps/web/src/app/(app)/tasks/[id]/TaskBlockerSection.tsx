'use client'

import { Button } from '@ops/ui/components/ui/button'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTaskSheetDirtyChange } from '@ops/ui/composites/TaskSheet'
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

function BlockerSaveFeedback({
  copy,
  saved,
  dirty,
  failed,
}: Readonly<{
  copy: (typeof TASK_RESPONSIBILITY_COPY)['en']
  saved: boolean
  dirty: boolean
  failed: boolean
}>) {
  return (
    <>
      {saved && !dirty ? (
        <p className="text-xs text-muted-foreground" role="status">
          {copy.saved}
        </p>
      ) : null}
      {failed ? (
        <p role="alert" className="text-xs text-destructive">
          {copy.failed}
        </p>
      ) : null}
    </>
  )
}

function BlockerEditor({
  copy,
  people,
  blockedReason,
  reason,
  waitingOn,
  pending,
  failed,
  saved,
  dirty,
  onReason,
  onWaitingOn,
  onSave,
  onUnblock,
}: Readonly<{
  copy: (typeof TASK_RESPONSIBILITY_COPY)['en']
  people: TaskResponsibilityProps['people']
  blockedReason: string | null
  reason: string
  waitingOn: string
  pending: boolean
  failed: boolean
  saved: boolean
  dirty: boolean
  onReason: (value: string) => void
  onWaitingOn: (value: string) => void
  onSave: () => void
  onUnblock: () => void
}>) {
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
          onReason={onReason}
          onWaitingOn={onWaitingOn}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending || !dirty || reason.trim() === ''} onClick={onSave}>
            {pending ? copy.saving : copy.saveBlocker}
          </Button>
          {blockedReason ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onUnblock}>
              {copy.unblock}
            </Button>
          ) : null}
        </div>
        <BlockerSaveFeedback copy={copy} saved={saved} dirty={dirty} failed={failed} />
      </div>
    </details>
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
  const [saved, setSaved] = useState(false)
  const dirty = !saved && (reason !== (blockedReason ?? '') || waitingOn !== (waitingOnId ?? ''))
  useTaskSheetDirtyChange('blocker', dirty)

  async function save(patch: Record<string, unknown>): Promise<boolean> {
    if (pending) return false
    setPending(true)
    setFailed(false)
    setSaved(false)
    const ok = await saveTaskPatch({ taskId, updatedAt, patch })
    if (ok) {
      setSaved(true)
      router.refresh()
    } else setFailed(true)
    setPending(false)
    return ok
  }

  return (
    <BlockerEditor
      copy={copy}
      people={people}
      blockedReason={blockedReason}
      reason={reason}
      waitingOn={waitingOn}
      pending={pending}
      failed={failed}
      saved={saved}
      dirty={dirty}
      onReason={(value) => {
        setSaved(false)
        setReason(value)
      }}
      onWaitingOn={(value) => {
        setSaved(false)
        setWaitingOn(value)
      }}
      onSave={() => {
        void save({ blockedReason: reason.trim(), waitingOnId: waitingOn || null })
      }}
      onUnblock={() => {
        void save({ blockedReason: null, waitingOnId: null }).then((ok) => {
          if (ok) {
            setReason('')
            setWaitingOn('')
          }
        })
      }}
    />
  )
}
