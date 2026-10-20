'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@ops/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../use-guarded-transition'
import { saveLeadView } from '../../../server/actions/crm/lead-views'
import { LEAD_MORE_COPY } from '../../../i18n/lead-more-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'

export type LeadViewLink = Readonly<{ id: string; label: string; query: string }>

function SaveLeadViewDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const router = useRouter()
  const search = useSearchParams()
  const copy = catalogFor(LEAD_MORE_COPY, useLocale())
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setError)
  const save = () => {
    startTransition(async () => {
      const result = await saveLeadView({
        name,
        filter: {
          q: search.get('q') ?? undefined,
          stages: search.getAll('stage'),
          source: search.get('source') ?? undefined,
          owner: search.get('owner') ?? undefined,
        },
      })
      if (!result.ok) {
        setError(result.error.message || copy.saveFailed)
        return
      }
      setName('')
      setError(null)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.saveViewTitle}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          aria-label={copy.viewName}
          placeholder={copy.viewName}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        {error === null ? null : (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {copy.cancel}
          </Button>
          <Button disabled={name.trim() === '' || pending} onClick={save}>
            {copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Groups secondary view and file actions into one compact menu. */
export function LeadViewControls({
  views,
  canImportExport,
}: Readonly<{ views: readonly LeadViewLink[]; canImportExport: boolean }>) {
  const router = useRouter()
  const copy = catalogFor(LEAD_MORE_COPY, useLocale())
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
          <MoreHorizontal aria-hidden />
          {copy.more}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{copy.views}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => {
                    router.push(view.query === '' ? '/leads' : `/leads?${view.query}`)
                  }}
                >
                  {view.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={() => {
              setDialogOpen(true)
            }}
          >
            {copy.saveView}
          </DropdownMenuItem>
          {canImportExport ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{copy.files}</DropdownMenuLabel>
                <DropdownMenuItem render={<a href="/settings/import?type=lead" />}>{copy.import}</DropdownMenuItem>
                <DropdownMenuItem render={<a href="/api/v1/export/leads" download />}>{copy.export}</DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <SaveLeadViewDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
