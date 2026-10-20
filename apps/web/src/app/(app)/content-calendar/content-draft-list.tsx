'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { DateField } from '@ops/ui/composites/DateField'
import { useState } from 'react'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import type { ContentItem, DraftEdit } from './content-calendar-pieces'

function ContentDraftRow({
  item,
  locale,
  copy,
  pending,
  onDraftUpdate,
  onPublish,
}: Readonly<{
  item: ContentItem
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
}>) {
  const [channel, setChannel] = useState(item.channel ?? '')
  const [publishAt, setPublishAt] = useState(item.publishAt)
  function saveDraft() {
    onDraftUpdate(item, { channel, publishAt })
  }
  function markPublished() {
    onPublish(item)
  }
  return (
    <li className="grid gap-2 p-4">
      <p className="text-sm font-medium">{item.title}</p>
      <p className="text-xs text-muted-foreground">{item.projectName}</p>
      {item.status === 'draft' ? (
        <div className="grid gap-2">
          <Input
            aria-label={copy.channel}
            placeholder={copy.channel}
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value)
            }}
            maxLength={100}
          />
          <DateField
            label={copy.date}
            value={publishAt}
            locale={locale === 'es' ? 'es-ES' : 'en-US'}
            placeholder={copy.chooseDate}
            clearLabel={copy.clear}
            disabled={pending}
            onChange={setPublishAt}
          />
          <Button size="sm" variant="outline" disabled={pending} onClick={saveDraft}>
            {copy.scheduleDraft}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={markPublished}>
          {copy.markPublished}
        </Button>
      )}
    </li>
  )
}

export function ContentDrafts({
  items,
  locale,
  copy,
  pending,
  onDraftUpdate,
  onPublish,
}: Readonly<{
  items: readonly ContentItem[]
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
}>) {
  const unscheduled = items.filter((item) => item.publishAt === null || item.status === 'draft')
  return (
    <aside className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{copy.drafts}</h2>
      </div>
      {unscheduled.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{copy.noDrafts}</p>
      ) : (
        <ul className="divide-y">
          {unscheduled.map((item) => (
            <ContentDraftRow
              key={item.id}
              item={item}
              locale={locale}
              copy={copy}
              pending={pending}
              onDraftUpdate={onDraftUpdate}
              onPublish={onPublish}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}
