'use client'

import { useState, useTransition, type SetStateAction, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@ops/ui/components/ui/dialog'
import { formatDateTimeLocalInput } from '@ops/ui/lib/dates'
import { changeScheduleItem } from '../../../server/actions/crm/schedule-items'
import { zonedMinuteToUnix } from '@ops/module-intake'
import { isScheduleStatus, scheduleEditorCopy, type ScheduleEditorCopy } from '../../../i18n/schedule-edit-copy'

type Item = Readonly<{
  id: string
  kind: 'appointment' | 'callback'
  recordType: 'lead' | 'contact'
  recordId: string
  startsAt: number
  status: 'scheduled' | 'completed' | 'cancelled'
  assigneeIds: readonly string[]
  assignableIds: readonly string[]
  updatedAt: number
}>
function ScheduleAssignees({
  item,
  people,
  pending,
  assignees,
  setAssignees,
  copy,
}: Readonly<{
  item: Item
  people: readonly Readonly<{ id: string; name: string }>[]
  pending: boolean
  assignees: readonly string[]
  setAssignees: (value: SetStateAction<readonly string[]>) => void
  copy: ScheduleEditorCopy
}>) {
  return (
    <fieldset disabled={pending} className="grid gap-1">
      <legend className="mb-1 text-sm font-medium">{copy.assignees}</legend>
      {people
        .filter((person) => item.assignableIds.includes(person.id))
        .map((person) => (
          <label key={person.id} className="flex items-center gap-2 py-1 text-sm">
            <Checkbox
              checked={assignees.includes(person.id)}
              onCheckedChange={(checked) => {
                setAssignees(checked ? [...assignees, person.id] : assignees.filter((id) => id !== person.id))
              }}
            />
            {person.name}
          </label>
        ))}
    </fieldset>
  )
}

function useScheduleEditor({
  item,
  canAssign,
  assignees,
  timeZone,
  copy,
}: Readonly<{
  item: Item
  canAssign: boolean
  assignees: readonly string[]
  timeZone: string
  copy: ScheduleEditorCopy
}>) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const dismiss = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('event')
    router.replace(`${url.pathname}${url.search}`)
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const localWhen = form.get('startsAt')
    const status = form.get('status')
    if (typeof localWhen !== 'string' || !isScheduleStatus(status)) return
    const startsAt = zonedMinuteToUnix(localWhen, timeZone)
    if (startsAt === undefined || !Number.isSafeInteger(startsAt) || startsAt < 0) {
      setError(copy.fail)
      return
    }
    setError(undefined)
    startTransition(async () => {
      try {
        const result = await changeScheduleItem({
          id: item.id,
          expectedUpdatedAt: item.updatedAt,
          patch: { startsAt, status, ...(canAssign ? { assigneeIds: assignees } : {}) },
        })
        if (!result.ok) {
          setError(result.error.message || copy.fail)
          router.refresh()
          return
        }
        dismiss()
        router.refresh()
      } catch {
        setError(copy.fail)
        router.refresh()
      }
    })
  }
  return { pending, error, submit, dismiss }
}

function ScheduleForm({
  item,
  people,
  canAssign,
  timeZone,
  copy,
  pending,
  assignees,
  setAssignees,
  error,
  onSubmit,
  onDismiss,
}: Readonly<{
  item: Item
  people: readonly Readonly<{ id: string; name: string }>[]
  canAssign: boolean
  timeZone: string
  copy: ScheduleEditorCopy
  pending: boolean
  assignees: readonly string[]
  setAssignees: (value: SetStateAction<readonly string[]>) => void
  error: string | undefined
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  onDismiss: () => void
}>) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-1.5 text-sm font-medium">
        {copy.when}
        <Input
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={formatDateTimeLocalInput(item.startsAt, timeZone)}
          disabled={pending}
        />
        <span className="text-xs text-muted-foreground">
          {copy.timeZone} · {timeZone}
        </span>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        {copy.status}
        <NativeSelect name="status" defaultValue={item.status} disabled={pending}>
          <option value="scheduled">{copy.scheduled}</option>
          <option value="completed">{copy.completed}</option>
          <option value="cancelled">{copy.cancelled}</option>
        </NativeSelect>
      </label>
      {canAssign ? (
        <ScheduleAssignees
          item={item}
          people={people}
          pending={pending}
          assignees={assignees}
          setAssignees={setAssignees}
          copy={copy}
        />
      ) : null}
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onDismiss}>
          {copy.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ScheduleEditDialog({
  item,
  people,
  canAssign,
  locale,
  timeZone,
}: Readonly<{
  item: Item
  people: readonly Readonly<{ id: string; name: string }>[]
  canAssign: boolean
  locale: string
  timeZone: string
}>) {
  const [assignees, setAssignees] = useState(item.assigneeIds)
  const copy = scheduleEditorCopy(locale)
  const editor = useScheduleEditor({ item, canAssign, assignees, timeZone, copy })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !editor.pending) editor.dismiss()
      }}
    >
      <DialogContent showCloseButton={!editor.pending}>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{item.kind === 'callback' ? copy.callback : copy.appointment}</DialogDescription>
        <ScheduleForm
          item={item}
          people={people}
          canAssign={canAssign}
          timeZone={timeZone}
          copy={copy}
          pending={editor.pending}
          assignees={assignees}
          setAssignees={setAssignees}
          error={editor.error}
          onSubmit={editor.submit}
          onDismiss={editor.dismiss}
        />
      </DialogContent>
    </Dialog>
  )
}
