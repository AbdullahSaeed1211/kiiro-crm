'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { DateField } from '@ops/ui/composites/DateField'
import { useState } from 'react'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import type { ContentItemRecord } from '@ops/module-work'

export interface ContentItem extends ContentItemRecord {
  readonly projectName: string
}
export interface ProjectOption {
  readonly id: string
  readonly name: string
}
export interface DraftEdit {
  readonly channel: string
  readonly publishAt: number | null
}
export interface CreateContentInput {
  readonly projectId: string
  readonly title: string
  readonly channel: string | null
  readonly publishAt: number | null
  readonly status: 'draft' | 'scheduled'
}

function contentStatus(channel: string, publishAt: number | null): CreateContentInput['status'] {
  if (channel.trim() !== '' && publishAt !== null) return 'scheduled'
  return 'draft'
}

function ContentScheduleFields({
  projectId,
  projects,
  channel,
  publishAt,
  locale,
  copy,
  pending,
  onProjectChange,
  onChannelChange,
  onPublishAtChange,
}: Readonly<{
  projectId: string
  projects: readonly ProjectOption[]
  channel: string
  publishAt: number | null
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onProjectChange: (value: string) => void
  onChannelChange: (value: string) => void
  onPublishAtChange: (value: number | null) => void
}>) {
  return (
    <>
      <label className="grid gap-1.5 text-sm">
        <span>{copy.project}</span>
        <select
          className="h-9 rounded-md border bg-background px-3"
          value={projectId}
          onChange={(event) => {
            onProjectChange(event.target.value)
          }}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>{copy.channel}</span>
        <Input
          value={channel}
          onChange={(event) => {
            onChannelChange(event.target.value)
          }}
          maxLength={100}
        />
      </label>
      <div className="grid gap-1.5 text-sm sm:col-span-2">
        <span>{copy.date}</span>
        <DateField
          label={copy.date}
          value={publishAt}
          locale={locale === 'es' ? 'es-ES' : 'en-US'}
          placeholder={copy.chooseDate}
          clearLabel={copy.clear}
          disabled={pending}
          onChange={onPublishAtChange}
        />
      </div>
    </>
  )
}

export function ContentComposer({
  projects,
  selectedProjectId,
  locale,
  copy,
  pending,
  onCreate,
}: Readonly<{
  projects: readonly ProjectOption[]
  selectedProjectId: string
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onCreate: (input: CreateContentInput) => void
}>) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(selectedProjectId !== '' ? selectedProjectId : (projects.at(0)?.id ?? ''))
  const [channel, setChannel] = useState('')
  const [publishAt, setPublishAt] = useState<number | null>(null)
  const status = contentStatus(channel, publishAt)

  function submit() {
    const value = title.trim()
    if (value === '' || projectId === '') return
    onCreate({ projectId, title: value, channel: channel.trim() || null, publishAt, status })
    setTitle('')
    setChannel('')
    setPublishAt(null)
  }

  const buttonLabel = submitLabel({ pending, status, copy })
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2" action={submit}>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span>{copy.title}</span>
        <Input
          autoFocus
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          maxLength={300}
          required
        />
      </label>
      <ContentScheduleFields
        projectId={projectId}
        projects={projects}
        channel={channel}
        publishAt={publishAt}
        locale={locale}
        copy={copy}
        pending={pending}
        onProjectChange={setProjectId}
        onChannelChange={setChannel}
        onPublishAtChange={setPublishAt}
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending || title.trim() === '' || projectId === ''}
        className="justify-self-start"
      >
        {buttonLabel}
      </Button>
    </form>
  )
}

function submitLabel(input: {
  readonly pending: boolean
  readonly status: CreateContentInput['status']
  readonly copy: AgencyWorkCopy
}): string {
  const { pending, status, copy } = input
  if (pending) return copy.saving
  if (status === 'scheduled') return copy.schedule
  return copy.saveDraft
}
