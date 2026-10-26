'use client'

import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import { ContentCaptureForm } from './content-capture-form'
import type { CreateContentInput, ProjectOption } from './content-types'
export type { ContentItem, CreateContentInput, DraftEdit, ProjectOption } from './content-types'

function contentStatus(channel: string, publishAt: number | null): CreateContentInput['status'] {
  if (channel.trim() !== '' && publishAt !== null) return 'scheduled'
  return 'draft'
}

function createInput(input: {
  projectId: string
  title: string
  channel: string
  publishAt: number | null
  showSchedule: boolean
}): CreateContentInput {
  const channel = input.showSchedule ? input.channel.trim() || null : null
  const publishAt = input.showSchedule ? input.publishAt : null
  return {
    projectId: input.projectId,
    title: input.title,
    channel,
    publishAt,
    status: contentStatus(channel ?? '', publishAt),
  }
}

export function ContentComposer({
  projects,
  selectedProjectId,
  locale,
  copy,
  pending,
  onCreate,
  error,
}: Readonly<{
  projects: readonly ProjectOption[]
  selectedProjectId: string
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onCreate: (input: CreateContentInput) => Promise<boolean>
  error?: string
}>) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(selectedProjectId)
  const [channel, setChannel] = useState('')
  const [publishAt, setPublishAt] = useState<number | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const status = createInput({ projectId, title, channel, publishAt, showSchedule }).status

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = title.trim()
    if (value === '' || projectId === '') return
    const saved = await onCreate(createInput({ projectId, title: value, channel, publishAt, showSchedule }))
    if (saved) {
      setTitle('')
      setChannel('')
      setPublishAt(null)
      setShowSchedule(false)
      setMobileExpanded(false)
    }
  }

  const buttonLabel = submitLabel({ pending, status, copy })
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="justify-self-start md:hidden"
        aria-expanded={mobileExpanded}
        aria-controls="content-capture-form"
        onClick={() => {
          setMobileExpanded((current) => !current)
        }}
      >
        {mobileExpanded ? copy.cancel : copy.addContent}
      </Button>
      <div id="content-capture-form" className={mobileExpanded ? 'block' : 'hidden md:block'}>
        <ContentCaptureForm
          title={title}
          setTitle={setTitle}
          projectId={projectId}
          setProjectId={setProjectId}
          projects={projects}
          pending={pending}
          showSchedule={showSchedule}
          setShowSchedule={setShowSchedule}
          channel={channel}
          setChannel={setChannel}
          publishAt={publishAt}
          setPublishAt={setPublishAt}
          locale={locale}
          copy={copy}
          error={error}
          buttonLabel={buttonLabel}
          onSubmit={(event) => {
            void submit(event)
          }}
        />
      </div>
    </div>
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
