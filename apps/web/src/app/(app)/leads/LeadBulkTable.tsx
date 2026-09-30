'use client'

import { Button } from '@ops/ui/components/ui/button'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { DataTable, type DataTableProps } from '@ops/ui/composites/DataTable'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { assignLeadsAction, moveLeadsAction } from '../../../server/crm/leads/actions'

type Option = Readonly<{ id: string; name: string }>
type BulkOptions = Readonly<{ owners: readonly Option[]; stages: readonly Option[] }>

function BulkSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: Readonly<{
  label: string
  placeholder: string
  value: string
  options: readonly Option[]
  onChange: (value: string) => void
}>) {
  return (
    <NativeSelect
      size="sm"
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function BulkBar({ ids, owners, stages }: Readonly<{ ids: readonly string[] } & BulkOptions>) {
  const router = useRouter()
  const [ownerId, setOwnerId] = useState('')
  const [stageId, setStageId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const apply = () => {
    startTransition(async () => {
      const result =
        stageId === ''
          ? await assignLeadsAction({ ids, ownerId: ownerId === 'none' ? null : ownerId })
          : await moveLeadsAction({ ids, toStageId: stageId })
      if (!result.ok) {
        setMessage(result.error.message)
        return
      }
      setMessage(`${String(result.data.updated)} updated, ${String(result.data.skipped)} skipped`)
      setOwnerId('')
      setStageId('')
      router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bulk actions">
      <BulkSelect
        label="Assign owner"
        placeholder="Assign owner…"
        value={ownerId}
        options={[{ id: 'none', name: 'Unassigned' }, ...owners]}
        onChange={(value) => {
          setOwnerId(value)
          setStageId('')
        }}
      />
      <BulkSelect
        label="Move to stage"
        placeholder="Move to stage…"
        value={stageId}
        options={stages}
        onChange={(value) => {
          setStageId(value)
          setOwnerId('')
        }}
      />
      <Button size="sm" disabled={(ownerId === '' && stageId === '') || pending} onClick={apply}>
        Apply to {ids.length}
      </Button>
      {message === null ? null : (
        <span role="status" className="text-xs text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  )
}

/** The lead table with a bulk-action bar for managers and owners. */
export function LeadBulkTable({
  bulk,
  ...table
}: Readonly<Omit<DataTableProps, 'bulkActions' | 'selectable'> & { bulk: BulkOptions | null }>) {
  return (
    <DataTable
      {...table}
      selectable={bulk !== null}
      {...(bulk === null ? {} : { bulkActions: (ids: readonly string[]) => <BulkBar ids={ids} {...bulk} /> })}
    />
  )
}
