'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { buttonVariants } from '@ops/ui/components/ui/button'
import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import { catalogFor } from '../../../i18n/locale'
import { AGENCY_WORK_COPY, type AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import { useLocale } from '../../../i18n/locale-context'
import { createContentItem, updateContentItem } from '../../../server/actions/work/agency-work'
import type { ContentItem, CreateContentInput, DraftEdit, ProjectOption } from './content-calendar-pieces'
import { ContentCalendarWorkbench } from './content-calendar-workbench'

function calendarEvents(
  items: readonly ContentItem[],
  input: { copy: AgencyWorkCopy; year: number; month: number; projectId: string },
): CalendarEvent[] {
  return items.flatMap((item) => {
    if (item.publishAt === null || item.status === 'draft') return []
    const params = new URLSearchParams({ month: String(input.month), year: String(input.year), contentItemId: item.id })
    if (input.projectId !== '') params.set('projectId', input.projectId)
    return [
      {
        id: item.id,
        title: `${item.title} · ${item.channel ?? input.copy.draft}`,
        date: new Date(item.publishAt).toISOString().slice(0, 10),
        href: `/content-calendar?${params.toString()}`,
        color: item.status === 'published' ? 'green' : 'blue',
      },
    ]
  })
}

function useContentActions({
  initialItems,
  projects,
  copy,
}: Readonly<{ initialItems: readonly ContentItem[]; projects: readonly ProjectOption[]; copy: AgencyWorkCopy }>) {
  const [items, setItems] = useState(initialItems)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function saveNew(input: CreateContentInput): Promise<boolean> {
    setPending(true)
    setMessage('')
    try {
      const result = await createContentItem(input)
      if (!result.ok) {
        setMessage(result.error.message || copy.saveError)
        return false
      }
      const project = projects.find((entry) => entry.id === result.value.projectId)
      if (project !== undefined) setItems((current) => [{ ...result.value, projectName: project.name }, ...current])
      return true
    } catch {
      setMessage(copy.saveError)
      return false
    } finally {
      setPending(false)
    }
  }

  async function update(
    item: ContentItem,
    patch: {
      readonly title?: string
      readonly channel?: string | null
      readonly publishAt?: number | null
      readonly status?: ContentItem['status']
    },
  ): Promise<string | null> {
    setPending(true)
    setMessage('')
    try {
      const result = await updateContentItem({ contentItemId: item.id, expectedUpdatedAt: item.updatedAt, patch })
      if (!result.ok) {
        const error = result.error.code === 'CONFLICT' ? copy.conflictError : result.error.message || copy.saveError
        setMessage(error)
        return error
      }
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, ...result.value } : entry)))
      return null
    } catch {
      setMessage(copy.saveError)
      return copy.saveError
    } finally {
      setPending(false)
    }
  }
  return { items, pending, message, saveNew, update }
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

export function ContentCalendarView({
  initialItems,
  projects,
  selectedProjectId,
  selectedContentItemId,
  year,
  month,
  weekStartsOn,
}: Readonly<{
  initialItems: readonly ContentItem[]
  projects: readonly ProjectOption[]
  selectedProjectId: string
  selectedContentItemId: string
  year: number
  month: number
  weekStartsOn: 0 | 1
}>) {
  const locale = useLocale()
  const copy = catalogFor(AGENCY_WORK_COPY, locale)
  const router = useRouter()
  const { items, pending, message, saveNew, update } = useContentActions({ initialItems, projects, copy })
  const selectedItem = items.find((item) => item.id === selectedContentItemId) ?? null
  const events = calendarEvents(items, { copy, year, month, projectId: selectedProjectId })

  function onDialogChange(open: boolean) {
    if (open) return
    const url = new URL(window.location.href)
    url.searchParams.delete('contentItemId')
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }
  function onProjectChange(projectId: string) {
    const params = new URLSearchParams({ month: String(month), year: String(year) })
    if (projectId !== '') params.set('projectId', projectId)
    router.push(`/content-calendar?${params.toString()}`)
  }
  function onEdit(item: ContentItem) {
    const params = new URLSearchParams({ month: String(month), year: String(year), contentItemId: item.id })
    if (selectedProjectId !== '') params.set('projectId', selectedProjectId)
    router.push(`/content-calendar?${params.toString()}`, { scroll: false })
  }
  async function onDraftUpdate(item: ContentItem, edit: DraftEdit) {
    const channel = edit.channel.trim() || null
    const status = channel !== null && edit.publishAt !== null ? 'scheduled' : 'draft'
    await update(item, { channel, publishAt: edit.publishAt, status })
  }
  async function onPublish(item: ContentItem) {
    await update(item, { status: 'published' })
  }

  if (projects.length === 0) return <NoContentProjects copy={copy} />
  return (
    <ContentCalendarWorkbench
      projects={projects}
      selectedProjectId={selectedProjectId}
      selectedItem={selectedItem}
      locale={locale}
      copy={copy}
      pending={pending}
      message={message}
      year={year}
      month={month}
      weekStartsOn={weekStartsOn}
      items={items}
      events={events}
      onProjectChange={onProjectChange}
      onCreate={saveNew}
      onDraftUpdate={(item, edit) => {
        void onDraftUpdate(item, edit)
      }}
      onPublish={(item) => {
        void onPublish(item)
      }}
      onEdit={onEdit}
      onDialogChange={onDialogChange}
      onSave={update}
    />
  )
}
