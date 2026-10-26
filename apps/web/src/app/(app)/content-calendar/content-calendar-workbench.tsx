'use client'

import { CalendarMonth } from '@ops/ui/composites/CalendarMonth'
import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import {
  ContentComposer,
  type ContentItem,
  type CreateContentInput,
  type DraftEdit,
  type ProjectOption,
} from './content-calendar-pieces'
import { ContentDrafts } from './content-draft-list'
import { ContentItemDialog } from './content-item-dialog'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import { ContentContextHeader } from './content-context-header'
import { ContentAgenda } from './content-agenda'
import type { WorkbenchProps } from './content-calendar-workbench-types'

function CalendarPanel({
  projects,
  selectedProjectId,
  locale,
  copy,
  pending,
  message,
  year,
  month,
  weekStartsOn,
  timeZone,
  today,
  events,
  onCreate,
}: Readonly<{
  projects: readonly ProjectOption[]
  selectedProjectId: string
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  message: string
  year: number
  month: number
  weekStartsOn: 0 | 1
  timeZone: string
  today: Readonly<{ year: number; month: number }>
  events: readonly CalendarEvent[]
  onCreate: (input: CreateContentInput) => Promise<boolean>
}>) {
  return (
    <div className="grid content-start gap-4">
      <ContentAgenda
        events={events}
        locale={locale}
        copy={copy}
        year={year}
        month={month}
        todayYear={today.year}
        todayMonth={today.month}
        projectId={selectedProjectId}
      />
      <ContentComposer
        projects={projects}
        selectedProjectId={selectedProjectId}
        locale={locale}
        copy={copy}
        pending={pending}
        onCreate={onCreate}
        error={message}
      />
      <div className="hidden md:block">
        {events.length === 0 ? (
          <p className="mb-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{copy.noContent}</p>
        ) : null}
        <CalendarMonth
          year={year}
          month={month - 1}
          events={events}
          locale={locale === 'es' ? 'es-ES' : 'en-US'}
          weekStartsOn={weekStartsOn}
          labels={{ previous: copy.previousMonth, next: copy.nextMonth, more: copy.moreEvents, today: copy.today }}
          today={new Intl.DateTimeFormat('en-CA', { timeZone }).format(Date.now())}
          query={selectedProjectId ? `projectId=${encodeURIComponent(selectedProjectId)}` : ''}
        />
      </div>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function WorkbenchColumns({
  projects,
  selectedProjectId,
  locale,
  copy,
  pending,
  message,
  year,
  month,
  weekStartsOn,
  timeZone,
  today,
  events,
  items,
  onCreate,
  onDraftUpdate,
  onPublish,
  onEdit,
}: Readonly<{
  projects: readonly ProjectOption[]
  selectedProjectId: string
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  message: string
  year: number
  month: number
  weekStartsOn: 0 | 1
  timeZone: string
  today: Readonly<{ year: number; month: number }>
  events: readonly CalendarEvent[]
  items: readonly ContentItem[]
  onCreate: (input: CreateContentInput) => Promise<boolean>
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
  onEdit: (item: ContentItem) => void
}>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <CalendarPanel
        projects={projects}
        selectedProjectId={selectedProjectId}
        locale={locale}
        copy={copy}
        pending={pending}
        message={message}
        year={year}
        month={month}
        weekStartsOn={weekStartsOn}
        timeZone={timeZone}
        today={today}
        events={events}
        onCreate={onCreate}
      />
      <ContentDrafts
        items={items}
        locale={locale}
        copy={copy}
        pending={pending}
        onDraftUpdate={onDraftUpdate}
        onPublish={onPublish}
        onEdit={onEdit}
      />
    </div>
  )
}

export function ContentCalendarWorkbench({
  projects,
  selectedProjectId,
  selectedItem,
  locale,
  copy,
  pending,
  message,
  year,
  month,
  weekStartsOn,
  timeZone,
  today,
  items,
  events,
  onProjectChange,
  onCreate,
  onDraftUpdate,
  onPublish,
  onEdit,
  onDialogChange,
  onSave,
}: WorkbenchProps) {
  return (
    <div className="grid gap-5">
      <ContentContextHeader
        selectedProjectId={selectedProjectId}
        projects={projects}
        items={items}
        copy={copy}
        onProjectChange={onProjectChange}
      />
      <WorkbenchColumns
        projects={projects}
        selectedProjectId={selectedProjectId}
        locale={locale}
        copy={copy}
        pending={pending}
        message={message}
        year={year}
        month={month}
        weekStartsOn={weekStartsOn}
        timeZone={timeZone}
        today={today}
        events={events}
        items={items}
        onCreate={onCreate}
        onDraftUpdate={onDraftUpdate}
        onPublish={onPublish}
        onEdit={onEdit}
      />
      <ContentItemDialog
        item={selectedItem}
        locale={locale}
        copy={copy}
        pending={pending}
        onOpenChange={onDialogChange}
        onSave={onSave}
      />
    </div>
  )
}
