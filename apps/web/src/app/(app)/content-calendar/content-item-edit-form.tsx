'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { DateField } from '@ops/ui/composites/DateField'
import { DialogDescription, DialogFooter, DialogTitle } from '@ops/ui/components/ui/dialog'
import type { SubmitEvent } from 'react'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import { formatDate } from '../../../i18n/format'
import type { ContentItem } from './content-calendar-pieces'

type ItemFieldProps = Readonly<{
  item: ContentItem
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  title: string
  setTitle: (value: string) => void
  channel: string
  setChannel: (value: string) => void
  publishAt: number | null
  setPublishAt: (value: number | null) => void
  status: ContentItem['status']
  setStatus: (value: ContentItem['status']) => void
}>

export function ContentItemEditForm({
  item,
  locale,
  copy,
  pending,
  title,
  setTitle,
  channel,
  setChannel,
  publishAt,
  setPublishAt,
  status,
  setStatus,
  error,
  onSubmit,
  onCancel,
}: ItemFieldProps &
  Readonly<{ error: string; onSubmit: (event: SubmitEvent<HTMLFormElement>) => void; onCancel: () => void }>) {
  return (
    <>
      <DialogTitle>{copy.editContent}</DialogTitle>
      <DialogDescription>
        {item.projectName} · {copy.editContentDescription}
      </DialogDescription>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <ContentItemFields
          item={item}
          locale={locale}
          copy={copy}
          pending={pending}
          title={title}
          setTitle={setTitle}
          channel={channel}
          setChannel={setChannel}
          publishAt={publishAt}
          setPublishAt={setPublishAt}
          status={status}
          setStatus={setStatus}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="submit" disabled={pending || title.trim() === ''}>
            {pending ? copy.saving : copy.saveChanges}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

function ContentItemFields({
  item,
  locale,
  copy,
  pending,
  title,
  setTitle,
  channel,
  setChannel,
  publishAt,
  setPublishAt,
  status,
  setStatus,
}: ItemFieldProps) {
  return (
    <>
      <label className="grid gap-1.5 text-sm">
        <span>{copy.title}</span>
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          maxLength={300}
          required
          disabled={pending}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>{copy.channel}</span>
        <Input
          value={channel}
          onChange={(event) => {
            setChannel(event.target.value)
          }}
          maxLength={100}
          disabled={pending}
        />
      </label>
      <div className="grid gap-1.5 text-sm">
        <span>
          {copy.date} · {copy.utcDate}
        </span>
        <DateField
          label={`${copy.date} · ${copy.utcDate}`}
          value={publishAt}
          locale={locale === 'es' ? 'es-ES' : 'en-US'}
          placeholder={copy.chooseDate}
          clearLabel={copy.clear}
          disabled={pending}
          onChange={setPublishAt}
        />
        {item.publishAt !== null && !isUtcMidnight(item.publishAt) ? (
          <span className="text-xs text-muted-foreground">
            {copy.existingPublishTime.replace('{time}', formatUtcTime(item.publishAt, locale))}
          </span>
        ) : null}
      </div>
      <label className="grid gap-1.5 text-sm">
        <span>{copy.status}</span>
        <NativeSelect
          value={status}
          disabled={pending}
          onChange={(event) => {
            setStatus(event.target.value as ContentItem['status'])
          }}
        >
          <option value="draft">{copy.draft}</option>
          <option value="scheduled">{copy.scheduled}</option>
          <option value="published">{copy.published}</option>
        </NativeSelect>
      </label>
    </>
  )
}

function isUtcMidnight(value: number): boolean {
  const date = new Date(value)
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  )
}

function formatUtcTime(value: number, locale: string): string {
  return formatDate(value, locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
