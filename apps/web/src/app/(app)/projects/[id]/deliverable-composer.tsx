'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRef, useState, type ChangeEvent } from 'react'
import type { AgencyWorkCopy } from '../../../../i18n/agency-work-copy'
import type { NewDeliverableInput } from './deliverables-pieces'

export function DeliverableComposer({
  projectId,
  copy,
  pending,
  onCreate,
}: Readonly<{
  projectId: string
  copy: AgencyWorkCopy
  pending: boolean
  onCreate: (input: NewDeliverableInput) => Promise<boolean>
}>) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  async function submit() {
    const value = title.trim()
    if (value === '') return
    if (!(await onCreate({ projectId, title: value, linkUrl: linkUrl.trim() || null, file }))) return
    setTitle('')
    setLinkUrl('')
    setFile(null)
    if (fileInput.current !== null) fileInput.current.value = ''
  }
  return (
    <form
      className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)_minmax(10rem,0.7fr)_auto]"
      action={submit}
    >
      <label className="grid gap-1.5 text-sm">
        <span>{copy.title}</span>
        <Input
          value={title}
          disabled={pending}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          maxLength={300}
          required
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>
          {copy.link} ({copy.optional})
        </span>
        <Input
          type="url"
          value={linkUrl}
          disabled={pending}
          onChange={(event) => {
            setLinkUrl(event.target.value)
          }}
          maxLength={2_000}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>{copy.file}</span>
        <Input
          ref={fileInput}
          type="file"
          disabled={pending}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setFile(event.target.files?.[0] ?? null)
          }}
        />
      </label>
      <Button type="submit" className="self-end" size="sm" disabled={pending || title.trim() === ''}>
        {pending ? copy.saving : copy.create}
      </Button>
    </form>
  )
}
