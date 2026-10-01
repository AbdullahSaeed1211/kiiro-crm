import {
  templateFor,
  type TemplateField,
  type TemplateStage,
  type TemplateView,
  type VerticalTemplate,
} from '@ops/templates'
import { revalidatePath } from 'next/cache'
import type { PayloadRequest } from 'payload'
import type { UntypedPayload } from '../../auth/api'
import { actionOk, actionError, actionFailure, type ActionResult } from '../../action-result'

interface PayloadContext {
  readonly payload: unknown
  readonly req: PayloadRequest
}

interface GlobalPayload {
  findGlobal(options: Record<string, unknown>): Promise<unknown>
  updateGlobal(options: Record<string, unknown>): Promise<unknown>
}

interface ExistingStage {
  readonly id?: unknown
  readonly name?: unknown
}

function objectOf(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function stageId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function stageRows(value: unknown): ExistingStage[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is ExistingStage => typeof entry === 'object' && entry !== null)
    : []
}

function nextStages(desired: readonly TemplateStage[], existing: ExistingStage[]): Record<string, unknown>[] {
  return desired.map((stage, index) => {
    const byName = existing.find((candidate) => candidate.name === stage.name)
    return {
      id: stageId(byName?.id) ?? stageId(existing.at(index)?.id) ?? crypto.randomUUID(),
      ...stage,
      position: index,
    }
  })
}

interface Target {
  readonly payload: UntypedPayload
  readonly context: PayloadContext
  /** True when no signed-in user is acting (provisioning), so writes skip the access rules. */
  readonly trusted: boolean
}

async function upsertWorkflow({
  payload,
  context,
  trusted,
  template,
  recordType,
}: Target &
  Readonly<{
    template: VerticalTemplate
    recordType: VerticalTemplate['workflows'][number]['recordType']
  }>): Promise<void> {
  const definition = template.workflows.find((candidate) => candidate.recordType === recordType)
  if (definition === undefined) return
  const found = await payload.find({
    collection: 'workflows',
    where: { recordType: { equals: recordType } },
    limit: 1,
    sort: 'createdAt',
    depth: 0,
    overrideAccess: trusted,
    req: context.req,
  })
  const current = found.docs[0]
  const stages = nextStages(definition.stages, stageRows(current?.stages))
  const data = { recordType, name: definition.name, stages, defaultStageId: stages[0]?.id }
  if (current?.id === undefined)
    await payload.create({ collection: 'workflows', data, req: context.req, overrideAccess: trusted })
  else
    await payload.update({ collection: 'workflows', id: current.id, data, req: context.req, overrideAccess: trusted })
}

async function upsertField({
  payload,
  context,
  trusted,
  field,
  position,
}: Target & Readonly<{ field: TemplateField; position: number }>): Promise<void> {
  const found = await payload.find({
    collection: 'fieldDefinitions',
    where: { and: [{ recordType: { equals: field.recordType } }, { key: { equals: field.key } }] },
    limit: 1,
    depth: 0,
    overrideAccess: trusted,
    req: context.req,
  })
  const data = {
    recordType: field.recordType,
    key: field.key,
    label: field.label,
    type: field.type,
    required: false,
    options: field.options ?? [],
    visibility: field.sensitive === true ? 'manager_up' : 'all',
    sensitive: field.sensitive === true,
    hidden: false,
    position,
  }
  const current = found.docs[0]
  if (current?.id === undefined)
    await payload.create({ collection: 'fieldDefinitions', data, req: context.req, overrideAccess: trusted })
  else
    await payload.update({
      collection: 'fieldDefinitions',
      id: current.id,
      data,
      req: context.req,
      overrideAccess: trusted,
    })
}

async function ensureView(target: Target, view: TemplateView): Promise<void> {
  const { payload, context, trusted } = target
  const found = await payload.find({
    collection: 'savedViews',
    where: { and: [{ recordType: { equals: view.recordType } }, { name: { equals: view.name } }] },
    limit: 1,
    depth: 0,
    overrideAccess: trusted,
    req: context.req,
  })
  if (found.docs[0]?.id !== undefined) return
  await payload.create({
    collection: 'savedViews',
    data: {
      recordType: view.recordType,
      owner: null,
      name: view.name,
      kind: view.kind,
      filter: null,
      sort: view.sort,
      columns: view.columns,
      pinned: view.name === 'All tasks',
      isDefault: view.name === 'All tasks',
    },
    req: context.req,
    overrideAccess: trusted,
  })
}

const REVALIDATED_PATHS = [
  '/settings',
  '/settings/fields',
  '/settings/views',
  '/settings/workflows',
  '/tasks',
  '/leads',
  '/deals',
] as const

function appliedTemplates(value: unknown): { key: string; version: number }[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is { key: string; version: number } => {
    const item = objectOf(entry)
    return typeof item.key === 'string' && typeof item.version === 'number'
  })
}

/** Creates or updates the template's workflows, fields and views without duplicating existing ones. */
async function applyConfiguration(target: Target, template: VerticalTemplate): Promise<void> {
  for (const workflow of template.workflows)
    await upsertWorkflow({ ...target, template, recordType: workflow.recordType })
  for (const [position, field] of template.fields.entries()) await upsertField({ ...target, field, position })
  // Saved views belong to a person, so a provisioning run (no signed-in user) leaves them for the owner's setup wizard.
  if (!target.trusted) for (const view of template.views) await ensureView(target, view)
}

/** Merges the template's modules and terminology into workspace settings and records that it was applied. */
async function applySettings(context: PayloadContext, template: VerticalTemplate): Promise<void> {
  const globalPayload = context.payload as GlobalPayload
  const settings = objectOf(await globalPayload.findGlobal({ slug: 'settings', depth: 0, req: context.req }))
  const applied = appliedTemplates(settings.appliedTemplates)
  const alreadyApplied = applied.some((entry) => entry.key === template.key && entry.version === template.version)
  await globalPayload.updateGlobal({
    slug: 'settings',
    data: {
      modules: { ...objectOf(settings.modules), ...template.modules },
      terminology: { ...objectOf(settings.terminology), ...template.terminology },
      appliedTemplates: alreadyApplied ? applied : [...applied, { key: template.key, version: template.version }],
    },
    overrideAccess: true,
    req: context.req,
  })
}

/** Applies one declarative vertical template idempotently to a tenant's configuration collections. */
export async function applyTemplate(
  context: PayloadContext,
  key: string,
  options: Readonly<{ trusted?: boolean }> = {},
): Promise<ActionResult<{ key: string }>> {
  const template = templateFor(key)
  if (template === undefined) return actionError('VALIDATION', 'Choose a supported business type.')
  try {
    await applyConfiguration(
      { payload: context.payload as UntypedPayload, context, trusted: options.trusted === true },
      template,
    )
    await applySettings(context, template)
    for (const path of REVALIDATED_PATHS) revalidatePath(path)
    return actionOk({ key: template.key })
  } catch (error) {
    return actionFailure(error, 'applyTemplate', 'Unable to apply the business preset.')
  }
}
