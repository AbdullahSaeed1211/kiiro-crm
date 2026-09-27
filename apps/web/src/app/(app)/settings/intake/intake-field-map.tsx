'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ActionResult } from '../../../../server/action-result'

export type IntakeTarget = Readonly<{ value: string; label: string }>
interface Row {
  name: string
  target: string
}

function TargetSelect({
  label,
  value,
  targets,
  onChange,
}: Readonly<{ label: string; value: string; targets: readonly IntakeTarget[]; onChange: (value: string) => void }>) {
  const labels = new Map(targets.map((target) => [target.value, target.label]))
  return (
    <Select
      value={value}
      onValueChange={(next: string | null) => {
        if (next !== null) onChange(next)
      }}
    >
      <SelectTrigger size="sm" aria-label={label} className="w-full">
        <SelectValue>{(selected: string) => labels.get(selected) ?? selected}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {targets.map((target) => (
          <SelectItem key={target.value} value={target.value}>
            {target.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function useRows(fieldMap: Readonly<Record<string, string>>) {
  const [rows, setRows] = useState<Row[]>(Object.entries(fieldMap).map(([name, target]) => ({ name, target })))
  const replace = (index: number, next: Row) => {
    setRows((current) => current.map((row, position) => (position === index ? next : row)))
  }
  const remove = (index: number) => {
    setRows((current) => current.filter((_, position) => position !== index))
  }
  const add = () => {
    setRows((current) => [...current, { name: '', target: 'ignore' }])
  }
  return { rows, replace, remove, add }
}

/** Maps each named form answer to a lead field or custom field, and saves the mapping on its own. */
export function IntakeFieldMap({
  formId,
  fieldMap,
  targets,
  action,
}: Readonly<{
  formId: string
  fieldMap: Readonly<Record<string, string>>
  targets: readonly IntakeTarget[]
  action: (input: { id: string; fieldMap: unknown }) => Promise<ActionResult>
}>) {
  const { rows, replace, remove, add } = useRows(fieldMap)
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const save = async () => {
    setPending(true)
    const map = Object.fromEntries(
      rows.filter((row) => row.name.trim() !== '').map((row) => [row.name.trim(), row.target]),
    )
    const result = await action({ id: formId, fieldMap: map })
    setPending(false)
    setMessage(result.ok ? 'Field mapping saved.' : result.error.message)
    if (result.ok) router.refresh()
  }
  return (
    <section className="space-y-3 border-t pt-5">
      <div>
        <h3 className="font-medium">Field mapping</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Match each form answer name to the lead field it fills. Custom fields come from Settings, Fields.
        </p>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-center">
          <Input
            aria-label={`Answer ${String(index + 1)} name`}
            value={row.name}
            onChange={(event) => {
              replace(index, { ...row, name: event.target.value })
            }}
          />
          <TargetSelect
            label={`Where answer ${String(index + 1)} goes`}
            value={row.target}
            targets={targets}
            onChange={(target) => {
              replace(index, { ...row, target })
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              remove(index)
            }}
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={add}>
          Add answer
        </Button>
        <Button size="sm" disabled={pending} onClick={() => void save()}>
          {pending ? 'Saving…' : 'Save mapping'}
        </Button>
        {message === null ? null : (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
