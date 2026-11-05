import { automationRulesSchema } from '@ops/module-automation'
import type { Metadata } from 'next'
import { AUTOMATION_COPY } from '../../../../i18n/automation-copy'
import { catalogFor, normalizeLocale } from '../../../../i18n/locale'
import { getProductContext, getWorkspaceSettings } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { AutomationRulesForm } from './automation-rules-form'
import { RunHistory, type RuleRunRow, type StoredAction } from './run-history'
import type { Choice, StageChoice } from './types'

export const metadata: Metadata = { title: AUTOMATION_COPY.en.pageTitle }
export const dynamic = 'force-dynamic'

async function activePeople(): Promise<readonly Choice[]> {
  const { payload, req } = await getProductContext()
  const found = await payload.find({
    collection: 'users',
    where: { active: { equals: true } },
    sort: 'name',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return found.docs.map((user) => ({ id: user.id, name: user.name }))
}

async function leadSources(): Promise<readonly Choice[]> {
  const { payload, req } = await getProductContext()
  const found = await payload.find({
    collection: 'sources',
    sort: 'name',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return found.docs.map((source) => ({ id: source.id, name: source.name }))
}

async function stageOptions(): Promise<readonly StageChoice[]> {
  const { payload, req } = await getProductContext()
  const found = await payload.find({
    collection: 'workflows',
    where: { recordType: { in: ['lead', 'deal'] } },
    sort: 'recordType',
    limit: 10,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return found.docs.flatMap((workflow) => {
    const group: StageChoice['group'] = workflow.recordType === 'deal' ? 'deal' : 'lead'
    const stages = Array.isArray(workflow.stages) ? workflow.stages.toSorted((a, b) => a.position - b.position) : []
    return stages.flatMap((stage) =>
      typeof stage.id === 'string' && stage.id !== '' ? [{ id: stage.id, name: stage.name, group }] : [],
    )
  })
}

function storedActions(value: unknown): readonly StoredAction[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const stored = item as Readonly<{ kind?: unknown; detail?: unknown; ok?: unknown }>
    const kind = stored.kind
    const detail = stored.detail
    const action = { kind: typeof kind === 'string' ? kind : 'unknown', ok: stored.ok !== false }
    return typeof detail === 'string' ? [{ ...action, detail }] : [action]
  })
}

async function recentRuns(): Promise<readonly RuleRunRow[]> {
  const { payload, req } = await getProductContext()
  const found = await payload.find({
    collection: 'ruleRuns',
    sort: '-startedAt',
    limit: 20,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return found.docs.map((run) => ({
    id: run.id,
    ruleName: run.ruleName,
    recordType: run.recordType,
    recordId: run.recordId,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: typeof run.finishedAt === 'number' ? run.finishedAt : null,
    actions: storedActions(run.actions),
    error: typeof run.error === 'string' ? run.error : null,
  }))
}

/** Automation: the workspace's rules, and what the last runs did. */
export default async function AutomationSettingsPage() {
  const [settings, people, sources, stages, runs] = await Promise.all([
    getWorkspaceSettings(),
    activePeople(),
    leadSources(),
    stageOptions(),
    recentRuns(),
  ])
  const locale = normalizeLocale(settings.locale)
  const copy = catalogFor(AUTOMATION_COPY, locale)
  const rules = automationRulesSchema.safeParse(settings.automationRules ?? [])
  return (
    <SettingsPage title={copy.pageTitle} description={copy.pageDescription} roles={['owner', 'manager']}>
      <SettingsForm>
        <AutomationRulesForm
          initial={rules.success ? rules.data : []}
          sources={sources}
          people={people}
          stages={stages}
        />
      </SettingsForm>
      <SettingsForm>
        <RunHistory runs={runs} locale={locale} copy={copy} />
      </SettingsForm>
    </SettingsPage>
  )
}
