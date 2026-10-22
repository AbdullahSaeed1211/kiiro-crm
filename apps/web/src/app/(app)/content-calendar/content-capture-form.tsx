'use client'

import type { ReactNode, SubmitEvent } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { DateField } from '@ops/ui/composites/DateField'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import type { ProjectOption } from './content-types'

type Props = Readonly<{
  title: string
  setTitle: (value: string) => void
  projectId: string
  setProjectId: (value: string) => void
  projects: readonly ProjectOption[]
  pending: boolean
  showSchedule: boolean
  setShowSchedule: (value: (current: boolean) => boolean) => void
  channel: string
  setChannel: (value: string) => void
  publishAt: number | null
  setPublishAt: (value: number | null) => void
  locale: string
  copy: AgencyWorkCopy
  error?: string
  buttonLabel: string
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
}>

function CaptureIdentity({
  title,
  setTitle,
  projectId,
  setProjectId,
  projects,
  pending,
  copy,
}: Pick<Props, 'title' | 'setTitle' | 'projectId' | 'setProjectId' | 'projects' | 'pending' | 'copy'>) {
  return (
    <>
      <div className="sm:col-span-2">
        <p className="text-sm font-semibold">{copy.addContent}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.roughCaptureHint}</p>
      </div>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span>{copy.title}</span>
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          maxLength={300}
          required
        />
      </label>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span>{copy.project}</span>
        <NativeSelect
          value={projectId}
          disabled={pending}
          onChange={(event) => {
            setProjectId(event.target.value)
          }}
        >
          <option value="">{copy.projectPlaceholder}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </label>
    </>
  )
}

function ScheduleFields({
  channel,
  setChannel,
  publishAt,
  setPublishAt,
  locale,
  copy,
  pending,
}: Pick<Props, 'channel' | 'setChannel' | 'publishAt' | 'setPublishAt' | 'locale' | 'copy' | 'pending'>) {
  return (
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm">
        <span>{copy.channel}</span>
        <Input
          value={channel}
          onChange={(event) => {
            setChannel(event.target.value)
          }}
          maxLength={100}
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
      </div>
    </div>
  )
}

function ScheduleDisclosure({
  expanded,
  setExpanded,
  copy,
  children,
}: Readonly<{
  expanded: boolean
  setExpanded: (value: (current: boolean) => boolean) => void
  copy: AgencyWorkCopy
  children: ReactNode
}>) {
  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto px-0 sm:col-span-2"
        onClick={() => {
          setExpanded((value) => !value)
        }}
      >
        {expanded ? copy.hideScheduleFields : copy.addScheduleFields}
      </Button>
      {expanded ? children : null}
    </>
  )
}

export function ContentCaptureForm(props: Props) {
  const {
    title,
    projectId,
    projects,
    pending,
    showSchedule,
    setShowSchedule,
    channel,
    publishAt,
    locale,
    copy,
    error,
    buttonLabel,
    onSubmit,
  } = props
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <CaptureIdentity
        title={title}
        setTitle={props.setTitle}
        projectId={projectId}
        setProjectId={props.setProjectId}
        projects={projects}
        pending={pending}
        copy={copy}
      />
      <ScheduleDisclosure expanded={showSchedule} setExpanded={setShowSchedule} copy={copy}>
        <ScheduleFields
          channel={channel}
          setChannel={props.setChannel}
          publishAt={publishAt}
          setPublishAt={props.setPublishAt}
          locale={locale}
          copy={copy}
          pending={pending}
        />
      </ScheduleDisclosure>
      {error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      ) : null}
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
