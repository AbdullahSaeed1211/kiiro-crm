import type { Metadata } from 'next'
import { requireRole } from '../../../../server/auth/context'
import { createIntakeForm, rotateIntakeServerKey, updateIntakeForm } from '../../../../server/actions/settings'
import {
  IntakeCreateForm,
  IntakeFormEditor,
  type IntakeFormView,
  type IntakeOption,
  type IntakeSubmissionView,
} from './intake-forms'
import { SettingsForm, SettingsPage } from '../settings-shell'

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
      <SettingsForm>
        <div>
          <h2 className="font-medium">Create a form</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New forms start fail-closed: add an exact website origin before accepting browser submissions.
          </p>
        </div>
        <IntakeCreateForm action={createIntakeForm} />
      </SettingsForm>
      {formViews.map((form) => (
        <SettingsForm key={form.id}>
          <IntakeFormEditor
            action={updateIntakeForm}
            form={form}
            groups={optionList(groups.docs)}
            rotateServerKey={rotateIntakeServerKey}
            sources={optionList(sources.docs)}
            users={optionList(users.docs)}
          />
        </SettingsForm>
      ))}
    </SettingsPage>
  )
}
