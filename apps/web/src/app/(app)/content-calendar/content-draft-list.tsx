'use client'

import { useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { DateField } from '@ops/ui/composites/DateField'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import type { ContentItem, DraftEdit } from './content-calendar-pieces'

type ContentView = 'draft' | 'scheduled' | 'published'

function getEmptyMessage(view: ContentView, copy: AgencyWorkCopy): string {
  if (view === 'draft') return copy.noDrafts
  if (view === 'scheduled') return copy.noScheduled
  return copy.noPublished
}

function ContentRowControls({
  item,
  view,
  locale,
  copy,
  pending,
  channel,
  setChannel,
  publishAt,
  setPublishAt,
  onDraftUpdate,
  onPublish,
}: Readonly<{
  item: ContentItem
  view: ContentView
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  channel: string
  setChannel: (value: string) => void
  publishAt: number | null
  setPublishAt: (value: number | null) => void
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
}>) {
  if (view === 'draft')
    return (
      <div className="grid gap-2">
        <Input
          aria-label={copy.channel}
          placeholder={copy.channel}
          value={channel}
          onChange={(event) => {
            setChannel(event.target.value)
          }}
          maxLength={100}
          disabled={pending}
        />
        <DateField
          label={`${copy.date} · ${copy.utcDate}`}
          value={publishAt}
          locale={locale === 'es' ? 'es-ES' : 'en-US'}
          placeholder={copy.chooseDate}
          clearLabel={copy.clear}
          disabled={pending}
          onChange={(value) => {
            setPublishAt(value)
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            onDraftUpdate(item, { channel, publishAt })
          }}
        >
          {copy.scheduleDraft}
        </Button>
      </div>
    )
  if (view === 'scheduled')
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          onPublish(item)
        }}
      >
        {copy.markPublished}
      </Button>
    )
  return null
}

function ContentRow({
  item,
  view,
  locale,
  copy,
  pending,
  onDraftUpdate,
  onPublish,
  onEdit,
}: Readonly<{
  item: ContentItem
  view: ContentView
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
  onEdit: (item: ContentItem) => void
}>) {
  const [channel, setChannel] = useState(item.channel ?? '')
  const [publishAt, setPublishAt] = useState(item.publishAt)
  return (
    <li className="grid gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.projectName}
            {item.channel ? ` · ${item.channel}` : ''}
          </p>
          {item.publishAt !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
                dateStyle: 'medium',
                timeZone: 'UTC',
              }).format(item.publishAt)}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            onEdit(item)
          }}
        >
          {copy.edit}
        </Button>
      </div>
      <ContentRowControls
        item={item}
        view={view}
        locale={locale}
        copy={copy}
        pending={pending}
        channel={channel}
        setChannel={setChannel}
        publishAt={publishAt}
        setPublishAt={setPublishAt}
        onDraftUpdate={onDraftUpdate}
        onPublish={onPublish}
      />
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
  onEdit,
}: Readonly<{
  items: readonly ContentItem[]
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
  onEdit: (item: ContentItem) => void
}>) {
  const [view, setView] = useState<ContentView>('draft')
  const views: readonly Readonly<{ key: ContentView; label: string }>[] = [
    { key: 'draft', label: copy.draftView },
    { key: 'scheduled', label: copy.scheduledView },
    { key: 'published', label: copy.publishedView },
  ]
  const visible = items.filter((item) => item.status === view)
  const empty = getEmptyMessage(view, copy)
  return (
    <aside className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{copy.contentOverview}</h2>
        <div role="tablist" aria-label={copy.contentOverview} className="mt-3 flex flex-wrap gap-1">
          {views.map((entry) => {
            const count = items.filter((item) => item.status === entry.key).length
            return (
              <Button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={view === entry.key}
                variant={view === entry.key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setView(entry.key)
                }}
              >
                {entry.label} <span className="ml-1 text-muted-foreground">{count}</span>
              </Button>
            )
          })}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {visible.map((item) => (
            <ContentRow
              key={item.id}
              item={item}
              view={view}
              locale={locale}
              copy={copy}
              pending={pending}
              onDraftUpdate={onDraftUpdate}
              onPublish={onPublish}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}
