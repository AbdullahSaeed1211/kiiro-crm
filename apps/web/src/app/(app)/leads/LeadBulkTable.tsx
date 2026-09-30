'use client'

import { Button } from '@ops/ui/components/ui/button'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { DataTable, type DataTableProps } from '@ops/ui/composites/DataTable'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { assignLeadsAction } from '../../../server/crm/leads/actions'

type Owner = Readonly<{ id: string; name: string }>

function BulkAssign({ ids, owners }: Readonly<{ ids: readonly string[]; owners: readonly Owner[] }>) {
  const router = useRouter()
  const [ownerId, setOwnerId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const apply = () => {
    startTransition(async () => {
      const result = await assignLeadsAction({ ids, ownerId: ownerId === 'none' ? null : ownerId })
      if (!result.ok) {
        setMessage(result.error.message)
        return
      }
      setMessage(
        result.data.skipped > 0
          ? `${String(result.data.updated)} updated, ${String(result.data.skipped)} skipped`
          : `${String(result.data.updated)} updated`,
      )
      router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bulk actions">
      <NativeSelect
        size="sm"
        aria-label="Assign owner"
        value={ownerId}
        onChange={(event) => {
          setOwnerId(event.target.value)
        }}
      >
        <option value="">Assign owner…</option>
        <option value="none">Unassigned</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.name}
          </option>
        ))}
      </NativeSelect>
      <Button size="sm" disabled={ownerId === '' || pending} onClick={apply}>
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

/** The lead table with a bulk-assign bar for managers and owners. */
export function LeadBulkTable({
  owners,
  ...table
}: Readonly<Omit<DataTableProps, 'bulkActions' | 'selectable'> & { owners: readonly Owner[] | null }>) {
  return (
    <DataTable
      {...table}
      selectable={owners !== null}
      {...(owners === null
        ? {}
        : { bulkActions: (ids: readonly string[]) => <BulkAssign ids={ids} owners={owners} /> })}
    />
  )
}
