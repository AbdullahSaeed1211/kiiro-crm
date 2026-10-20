'use client'

import { useState, type SyntheticEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@ops/ui/components/ui/dialog'
import { Input } from '@ops/ui/components/ui/input'
import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { createTask } from '../../../server/actions/work/tasks/createTask'
import type { CalendarCopy } from '../../../i18n/calendar-copy'

type Person = Readonly<{ id: string; name: string }>

function TitleInput({ label, disabled }: Readonly<{ label: string; disabled: boolean }>) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <Input name="title" required maxLength={300} disabled={disabled} autoFocus />
    </label>
  )
}

function CreateActions({
  copy,
  pending,
  onClose,
}: Readonly<{
  copy: CalendarCopy
  pending: boolean
  onClose: () => void
}>) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
        {copy.cancel}
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? copy.saving : copy.save}
      </Button>
    </DialogFooter>
  )
}

function PeoplePicker({
  people,
  value,
  onChange,
  disabled,
  label,
}: Readonly<{
  people: readonly Person[]
  value: readonly string[]
  onChange: (ids: readonly string[]) => void
  disabled: boolean
  label: string
}>) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid max-h-48 gap-1 overflow-y-auto">
        {people.map((person) => (
          <label key={person.id} className="flex items-center gap-2 py-1 text-sm">
            <Checkbox
              checked={value.includes(person.id)}
              onCheckedChange={(checked) => {
                onChange(checked ? [...value, person.id] : value.filter((id) => id !== person.id))
              }}
            />
            {person.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Calendar creation uses the normal task command, including permission checks and audit side effects. */
export function CalendarCreateDialog({
  date,
  people,
  initialAssignee,
  copy,
  onClose,
}: Readonly<{
  date: string
  people: readonly Person[]
  initialAssignee: string
  copy: CalendarCopy
  onClose: () => void
}>) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [assignees, setAssignees] = useState<readonly string[]>(initialAssignee === '' ? [] : [initialAssignee])
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const title = data.get('title')
    setPending(true)
    setError(undefined)
    try {
      const result = await createTask({
        title: typeof title === 'string' ? title.trim() : '',
        dueAt: Date.parse(`${date}T00:00:00.000Z`),
        assigneeIds: assignees,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError(copy.failed)
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent showCloseButton={!pending}>
        <DialogTitle>{copy.add}</DialogTitle>
        <DialogDescription>
          {copy.date}: {date}
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            void submit(event)
          }}
        >
          <TitleInput label={copy.title} disabled={pending} />
          <PeoplePicker
            people={people}
            value={assignees}
            onChange={setAssignees}
            disabled={pending}
            label={copy.people}
          />
          {error === undefined ? null : (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <CreateActions copy={copy} pending={pending} onClose={onClose} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
