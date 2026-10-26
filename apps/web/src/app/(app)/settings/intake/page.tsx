import type { Metadata } from 'next'
import { requireRole } from '../../../../server/auth/context'
import { createIntakeForm, rotateIntakeServerKey, updateIntakeForm } from '../../../../server/actions/settings/intake'
import {
  IntakeCreateForm,
  IntakeFormEditor,
  type IntakeFormView,
  type IntakeOption,
  type IntakeSubmissionView,
} from './intake-forms'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { IntakeFieldMap } from './intake-field-map'
import { headers } from 'next/headers'
import { IntakeFormQuestions, type Question } from './intake-form-questions'
import { formFieldsSchema } from '@ops/module-intake'
import { saveIntakeFieldMap } from '../../../../server/actions/settings/intake-field-map'
import { loadIntakeTargets } from '../../../../server/queries/settings/intake-targets'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const metadata: Metadata = { title: 'Intake' }
export const dynamic = 'force-dynamic'

// eslint-disable-next-line max-lines-per-function -- the page loads all manager-visible intake context together.
export default async function IntakeSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const [forms, users, groups, sources, submissions] = await Promise.all([
    context.payload.find({
      collection: 'intakeForms',
      sort: 'name',
      pagination: false,
      depth: 0,
      req: context.req,
    }),
    context.payload.find({ collection: 'users', sort: 'name', pagination: false, depth: 0, req: context.req }),
    context.payload.find({ collection: 'groups', sort: 'name', pagination: false, depth: 0, req: context.req }),
    context.payload.find({ collection: 'sources', sort: 'name', pagination: false, depth: 0, req: context.req }),
    context.payload.find({
      collection: 'intakeSubmissions',
      sort: '-receivedAt',
      limit: 50,
      depth: 0,
      req: context.req,
    }),
  ])
  const relationId = (value: unknown): string | undefined => {
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (typeof value === 'object' && value !== null && 'id' in value) return relationId(value.id)
    return undefined
  }
  const stringList = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  const optionList = (docs: readonly { id: string; name: string }[]): IntakeOption[] =>
    docs.map(({ id, name }) => ({ id, name }))
  const targets = await loadIntakeTargets()
  const { env } = await getCloudflareContext({ async: true })
  const requestHeaders = await headers()
  const origin = `${requestHeaders.get('x-forwarded-proto') ?? 'https'}://${requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? ''}`
  const fieldMaps = new Map(
    forms.docs.map((form) => {
      const map =
        typeof form.fieldMap === 'object' && form.fieldMap !== null && !Array.isArray(form.fieldMap)
          ? form.fieldMap
          : {}
      return [
        form.id,
        Object.fromEntries(
          Object.entries(map).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        ),
      ] as const
    }),
  )
  const questionsFor = (form: (typeof forms.docs)[number]): Question[] => {
    const parsed = formFieldsSchema.safeParse(form.formFields ?? [])
    const map = fieldMaps.get(form.id) ?? {}
    return parsed.success ? parsed.data.map((field) => ({ ...field, target: map[field.key] ?? 'ignore' })) : []
  }
  const formViews: IntakeFormView[] = forms.docs.map((form) => ({
    id: form.id,
    name: form.name,
    key: form.key,
    active: form.active,
    allowedOrigins: stringList(form.allowedOrigins),
    requireTurnstile: form.requireTurnstile,
    defaultOwnerId: relationId(form.defaultOwner),
    defaultAssigneeIds: (Array.isArray(form.defaultAssignees) ? form.defaultAssignees : [])
      .map(relationId)
      .filter((id): id is string => id !== undefined),
    defaultSourceId: relationId(form.defaultSource),
    notifyUserIds: (Array.isArray(form.notifyUsers) ? form.notifyUsers : [])
      .map(relationId)
      .filter((id): id is string => id !== undefined),
    notifyGroupIds: (Array.isArray(form.notifyGroups) ? form.notifyGroups : [])
      .map(relationId)
      .filter((id): id is string => id !== undefined),
    successMessage: form.successMessage,
    redirectUrl: form.redirectUrl ?? '',
    emailAlias: form.emailAlias ?? '',
    serverKeyCount: stringList(form.serverKeyHashes).length,
    submissions: submissions.docs
      .filter((submission) => relationId(submission.form) === form.id)
      .slice(0, 8)
      .map((submission): IntakeSubmissionView => ({
        id: submission.id,
        channel: submission.channel,
        status: submission.status,
        receivedAt: submission.receivedAt,
      })),
  }))
  return (
    <SettingsPage
      title="Intake"
      description="Configure secure public lead forms, routing, email intake, and delivery review."
      roles={['owner', 'manager']}
    >
      <details className="rounded-xl border bg-background px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Create a form</summary>
        <div className="pt-4">
          <p className="mb-4 text-sm text-muted-foreground">
            New forms start fail-closed: add an exact website origin before accepting browser submissions.
          </p>
          <IntakeCreateForm action={createIntakeForm} />
        </div>
      </details>
      <div className="grid gap-3">
        {formViews.length === 0 ? <p className="text-sm text-muted-foreground">No intake forms yet.</p> : null}
        {formViews.map((form, index) => (
          <details className="rounded-xl border bg-background" key={form.id} name="intake-form" open={index === 0}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm marker:hidden">
              <span className="min-w-0 truncate font-medium">{form.name}</span>
              <span className="shrink-0 text-muted-foreground">{form.active ? 'Active' : 'Paused'}</span>
            </summary>
            <SettingsForm>
              <IntakeFormEditor
                action={updateIntakeForm}
                form={form}
                origin={origin}
                turnstileSiteKey={env.TURNSTILE_SITE_KEY.trim()}
                groups={optionList(groups.docs)}
                rotateServerKey={rotateIntakeServerKey}
                sources={optionList(sources.docs)}
                users={optionList(users.docs)}
              />
              <details className="border-t pt-4">
                <summary className="cursor-pointer text-sm font-medium">Form questions</summary>
                <div className="pt-4">
                  <IntakeFormQuestions
                    formId={form.id}
                    formKey={form.key}
                    origin={origin}
                    initial={questionsFor(forms.docs.find((doc) => doc.id === form.id) ?? forms.docs[0])}
                    targets={targets}
                  />
                </div>
              </details>
              <details className="border-t pt-4">
                <summary className="cursor-pointer text-sm font-medium">Lead field mapping</summary>
                <div className="pt-4">
                  <IntakeFieldMap
                    formId={form.id}
                    fieldMap={fieldMaps.get(form.id) ?? {}}
                    targets={targets}
                    action={saveIntakeFieldMap}
                  />
                </div>
              </details>
            </SettingsForm>
          </details>
        ))}
      </div>
    </SettingsPage>
  )
}
