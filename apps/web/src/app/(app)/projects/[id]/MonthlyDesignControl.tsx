'use client'

import { Button } from '@ops/ui/components/ui/button'
import type { MonthlyDesignConfig } from '@ops/module-work'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatDate } from '../../../../i18n/format'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { MONTHLY_DESIGN_COPY, type MonthlyDesignCopy } from '../../../../i18n/monthly-design-copy'
import { saveProjectMonthlyDesign } from '../../../../server/actions/work/projects/saveProjectMonthlyDesign'
import { MonthlyDesignForm } from './MonthlyDesignForm'
import type { MonthlyDesignFormValues, MonthlyDesignPerson } from './monthly-design-form-state'

type MonthlyDesignPreview = Readonly<{ issueAt: number; dueAt: number }>

function cycleSummary(copy: MonthlyDesignCopy, config: MonthlyDesignConfig): string {
  return copy.cycleSummary.replace('{issueDay}', String(config.issueDay)).replace('{dueDay}', String(config.dueDay))
}

function configStatus(config: MonthlyDesignConfig | null, copy: MonthlyDesignCopy): string {
  if (config === null) return copy.notSetUp
  return config.enabled ? copy.active : copy.paused
}

function assigneeSummary({
  config,
  people,
  copy,
}: Readonly<{
  config: MonthlyDesignConfig | null
  people: readonly MonthlyDesignPerson[]
  copy: MonthlyDesignCopy
}>): string {
  if (config === null || config.assigneeIds.length === 0) return copy.noAssignees
  const names = config.assigneeIds.flatMap((id) => {
    const person = people.find((item) => item.id === id)
    return person === undefined ? [] : [person.name]
  })
  if (names.length === config.assigneeIds.length) return names.join(', ')
  return copy.assigneeCount.replace('{count}', String(config.assigneeIds.length))
}

/** Manager-only editor for the opt-in monthly design task schedule. */
export function MonthlyDesignControl({
  projectId,
  config,
  updatedAt,
  canManage,
  people,
  preview,
}: Readonly<{
  projectId: string
  config: MonthlyDesignConfig | null
  updatedAt: number
  canManage: boolean
  people: readonly MonthlyDesignPerson[]
  preview: MonthlyDesignPreview | null
}>) {
  const locale = useLocale()
  const copy = catalogFor(MONTHLY_DESIGN_COPY, locale)
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  function save(values: MonthlyDesignFormValues) {
    setError('')
    startTransition(async () => {
      const result = await saveProjectMonthlyDesign({ projectId, expectedUpdatedAt: updatedAt, ...values })
      if (!result.ok) {
        setError(result.error.code === 'CONFLICT' ? copy.conflict : result.error.message || copy.saveError)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <section className="ops-detail-card grid gap-3 rounded-lg border p-4" aria-labelledby="monthly-design-heading">
      <MonthlyDesignHeading
        config={config}
        canManage={canManage}
        editing={editing}
        copy={copy}
        onEdit={() => {
          setEditing(true)
        }}
      />
      <MonthlyDesignSummary config={config} people={people} preview={preview} locale={locale} copy={copy} />
      <p className="text-xs text-muted-foreground">{copy.actualPosting}</p>
      <p className="text-xs text-muted-foreground">{copy.futureOnly}</p>
      {canManage ? (
        <div hidden={!editing} key={updatedAt}>
          <MonthlyDesignForm
            initial={config}
            people={people}
            pending={pending}
            error={error}
            onSave={save}
            onCancel={() => {
              setEditing(false)
            }}
          />
        </div>
      ) : null}
    </section>
  )
}

function MonthlyDesignHeading({
  config,
  canManage,
  editing,
  copy,
  onEdit,
}: Readonly<{
  config: MonthlyDesignConfig | null
  canManage: boolean
  editing: boolean
  copy: MonthlyDesignCopy
  onEdit: () => void
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="monthly-design-heading" className="font-medium">
          {copy.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{configStatus(config, copy)}</p>
      </div>
      {canManage && !editing ? <ManageButton config={config} copy={copy} onEdit={onEdit} /> : null}
    </div>
  )
}

function ManageButton({
  config,
  copy,
  onEdit,
}: Readonly<{ config: MonthlyDesignConfig | null; copy: MonthlyDesignCopy; onEdit: () => void }>) {
  const label = config === null ? copy.setup : copy.edit
  return (
    <Button type="button" size="sm" variant="outline" onClick={onEdit}>
      {label}
    </Button>
  )
}

function MonthlyDesignSummary({
  config,
  people,
  preview,
  locale,
  copy,
}: Readonly<{
  config: MonthlyDesignConfig | null
  people: readonly MonthlyDesignPerson[]
  preview: MonthlyDesignPreview | null
  locale: string
  copy: MonthlyDesignCopy
}>) {
  if (config === null) return <p className="text-sm text-muted-foreground">{copy.monthlyTasksOff}</p>
  return (
    <div className="grid gap-2 text-sm">
      <p className="font-medium">{config.title}</p>
      <p className="text-muted-foreground">{cycleSummary(copy, config)}</p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{copy.assignees}:</span>{' '}
        {assigneeSummary({ config, people, copy })}
      </p>
      <NextCycle config={config} preview={preview} locale={locale} copy={copy} />
      {config.enabled ? null : <p className="text-muted-foreground">{copy.pauseNote}</p>}
    </div>
  )
}

function NextCycle({
  config,
  preview,
  locale,
  copy,
}: Readonly<{
  config: MonthlyDesignConfig
  preview: MonthlyDesignPreview | null
  locale: string
  copy: MonthlyDesignCopy
}>) {
  if (!config.enabled || preview === null) return null
  const issueDate = formatDate(preview.issueAt, locale, { dateStyle: 'medium', timeZone: 'UTC' })
  const dueDate = formatDate(preview.dueAt, locale, { dateStyle: 'medium', timeZone: 'UTC' })
  return (
    <p className="text-muted-foreground">
      <span className="font-medium text-foreground">{copy.nextCycle}:</span> {copy.workOrder} {issueDate} ·{' '}
      {copy.designDue} {dueDate}
    </p>
  )
}
