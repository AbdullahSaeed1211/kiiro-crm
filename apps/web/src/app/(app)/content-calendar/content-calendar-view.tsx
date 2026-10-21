'use client'

import Link from 'next/link'
import { buttonVariants } from '@ops/ui/components/ui/button'
import { CalendarMonth, type CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import { useState, useTransition } from 'react'
import { catalogFor } from '../../../i18n/locale'
import { AGENCY_WORK_COPY } from '../../../i18n/agency-work-copy'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import { useLocale } from '../../../i18n/locale-context'
import { createContentItem, updateContentItem } from '../../../server/actions/work/agency-work'
import {
  ContentComposer,
  type ContentItem,
  type CreateContentInput,
  type DraftEdit,
  type ProjectOption,
} from './content-calendar-pieces'
import { ContentDrafts } from './content-draft-list'

function isoDay(value: number) {
  return new Date(value).toISOString().slice(0, 10)
}

function calendarEvents(items: readonly ContentItem[], draftLabel: string): CalendarEvent[] {
  return items.flatMap((item) => {
    if (item.publishAt === null || item.status === 'draft') return []
    const color = item.status === 'published' ? 'green' : 'blue'
    return [
      {
        id: item.id,
        title: `${item.title} · ${item.channel ?? draftLabel}`,
        date: isoDay(item.publishAt),
        href: `/projects/${item.projectId}`,
        color,
      },
    ]
  })
}

function calendarLabels(locale: string) {
  return {
    previous: locale === 'es' ? 'Mes anterior' : 'Previous month',
    next: locale === 'es' ? 'Mes siguiente' : 'Next month',
    more: locale === 'es' ? '+{count} más' : '+{count} more',
    today: locale === 'es' ? 'Hoy' : 'Today',
  }
}

function NoContentProjects({ copy }: Readonly<{ copy: AgencyWorkCopy }>) {
  return (
    <div className="grid justify-items-start gap-3 rounded-lg border border-dashed p-6">
      <p className="text-sm text-muted-foreground">{copy.noProjects}</p>
      <Link href="/projects/new" className={buttonVariants({ size: 'sm' })}>
        {copy.createProject}
      </Link>
    </div>
  )
}

interface ContentHandlersInput {
  readonly startTransition: (callback: () => void) => void
  readonly saveNew: (input: CreateContentInput) => Promise<void>
  readonly update: (
    item: ContentItem,
    patch: {
      readonly channel?: string | null
      readonly publishAt?: number | null
      readonly status?: ContentItem['status']
    },
  ) => Promise<void>
}

function contentHandlers({ startTransition, saveNew, update }: ContentHandlersInput) {
  return {
    create: (input: CreateContentInput) => {
      startTransition(() => {
        void saveNew(input)
      })
    },
    saveDraft: (item: ContentItem, edit: DraftEdit) => {
      const channel = edit.channel.trim() || null
      const status = channel !== null && edit.publishAt !== null ? 'scheduled' : 'draft'
      startTransition(() => {
        void update(item, { channel, publishAt: edit.publishAt, status })
      })
    },
    publish: (item: ContentItem) => {
      startTransition(() => {
        void update(item, { status: 'published' })
      })
    },
  }
}

export function ContentCalendarView({
  initialItems,
  projects,
  selectedProjectId,
  year,
  month,
  weekStartsOn,
}: Readonly<{
  initialItems: readonly ContentItem[]
  projects: readonly ProjectOption[]
  selectedProjectId: string
  year: number
  month: number
  weekStartsOn: 0 | 1
}>) {
  const locale = useLocale()
  const copy = catalogFor(AGENCY_WORK_COPY, locale)
  const [items, setItems] = useState(initialItems)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const events = calendarEvents(items, copy.draft)

  async function saveNew(input: CreateContentInput) {
    const result = await createContentItem(input)
    if (!result.ok) {
      setMessage(result.error.message || copy.saveError)
      return
    }
    const project = projects.find((item) => item.id === result.value.projectId)
    if (project !== undefined) setItems((current) => [{ ...result.value, projectName: project.name }, ...current])
    setMessage('')
  }

  async function update(
    item: ContentItem,
    patch: {
      readonly channel?: string | null
      readonly publishAt?: number | null
      readonly status?: 'draft' | 'scheduled' | 'published'
    },
  ) {
    const result = await updateContentItem({ contentItemId: item.id, expectedUpdatedAt: item.updatedAt, patch })
    if (!result.ok) {
      setMessage(result.error.message || copy.saveError)
      return
    }
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, ...result.value } : entry)))
    setMessage('')
  }

  const { create, saveDraft, publish } = contentHandlers({ startTransition, saveNew, update })

  return (
    <ContentCalendarBody
      locale={locale}
      copy={copy}
      projects={projects}
      selectedProjectId={selectedProjectId}
      year={year}
      month={month}
      weekStartsOn={weekStartsOn}
      items={items}
      events={events}
      pending={pending}
      message={message}
      onCreate={create}
      onDraftUpdate={saveDraft}
      onPublish={publish}
    />
  )
}

function ContentCalendarBody({
  locale,
  copy,
  projects,
  selectedProjectId,
  year,
  month,
  weekStartsOn,
  items,
  events,
  pending,
  message,
  onCreate,
  onDraftUpdate,
  onPublish,
}: Readonly<{
  locale: string
  copy: AgencyWorkCopy
  projects: readonly ProjectOption[]
  selectedProjectId: string
  year: number
  month: number
  weekStartsOn: 0 | 1
  items: readonly ContentItem[]
  events: readonly CalendarEvent[]
  pending: boolean
  message: string
  onCreate: (input: CreateContentInput) => void
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
}>) {
  if (projects.length === 0) return <NoContentProjects copy={copy} />
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-4">
        <ContentComposer
          projects={projects}
          selectedProjectId={selectedProjectId}
          locale={locale}
          copy={copy}
          pending={pending}
          onCreate={onCreate}
        />
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{copy.noContent}</p>
        ) : null}
        <CalendarMonth
          year={year}
          month={month - 1}
          events={events}
          locale={locale === 'es' ? 'es-ES' : 'en-US'}
          weekStartsOn={weekStartsOn}
          labels={calendarLabels(locale)}
          today={isoDay(Date.now())}
          query={selectedProjectId ? `projectId=${encodeURIComponent(selectedProjectId)}` : ''}
        />
        {message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>
      <ContentDrafts
        items={items}
        locale={locale}
        copy={copy}
        pending={pending}
        onDraftUpdate={onDraftUpdate}
        onPublish={onPublish}
      />
    </div>
  )
}
