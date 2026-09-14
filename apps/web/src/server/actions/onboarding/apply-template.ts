import { templateFor, type TemplateField, type TemplateStage, type TemplateView, type VerticalTemplate } from '@ops/templates'
import { revalidatePath } from 'next/cache'
import type { PayloadRequest } from 'payload'
import type { UntypedPayload } from '../../auth/api'

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
  return Array.isArray(value) ? value.filter((entry): entry is ExistingStage => typeof entry === 'object' && entry !== null) : []
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

// eslint-disable-next-line max-params -- the four inputs keep template, request, and record identity explicit.
async function upsertWorkflow(
  payload: UntypedPayload,
  context: PayloadContext,
  template: VerticalTemplate,
  recordType: VerticalTemplate['workflows'][number]['recordType'],
): Promise<void> {
  const definition = template.workflows.find((candidate) => candidate.recordType === recordType)
  if (definition === undefined) return
  const found = await payload.find({
    collection: 'workflows',
    where: { recordType: { equals: recordType } },
    limit: 1,
    sort: 'createdAt',
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const current = found.docs[0]
  const stages = nextStages(definition.stages, stageRows(current?.stages))
  const data = { recordType, name: definition.name, stages, defaultStageId: stages[0]?.id }
  if (current?.id === undefined) await payload.create({ collection: 'workflows', data, req: context.req, overrideAccess: false })
  else await payload.update({ collection: 'workflows', id: current.id, data, req: context.req, overrideAccess: false })
}

// eslint-disable-next-line max-params -- field position is part of the persisted template contract.
async function upsertField(payload: UntypedPayload, context: PayloadContext, field: TemplateField, position: number): Promise<void> {
  const found = await payload.find({
    collection: 'fieldDefinitions',
    where: { and: [{ recordType: { equals: field.recordType } }, { key: { equals: field.key } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
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
  if (current?.id === undefined) await payload.create({ collection: 'fieldDefinitions', data, req: context.req, overrideAccess: false })
  else await payload.update({ collection: 'fieldDefinitions', id: current.id, data, req: context.req, overrideAccess: false })
}

async function ensureView(payload: UntypedPayload, context: PayloadContext, view: TemplateView): Promise<void> {
  const found = await payload.find({
    collection: 'savedViews',
    where: { and: [{ recordType: { equals: view.recordType } }, { name: { equals: view.name } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
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
    overrideAccess: false,
  })
}

/** Applies one declarative vertical template idempotently to a tenant's configuration collections. */
// eslint-disable-next-line complexity, max-statements -- template application is one atomic authorized workflow.
export async function applyTemplate(context: PayloadContext, key: string): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  const template = templateFor(key)
  if (template === undefined) return { ok: false, error: 'Choose a supported business type.' }
  const payload = context.payload as UntypedPayload
  try {
    for (const workflow of template.workflows) await upsertWorkflow(payload, context, template, workflow.recordType)
    for (const [index, field] of template.fields.entries()) await upsertField(payload, context, field, index)
    for (const view of template.views) await ensureView(payload, context, view)
    const globalPayload = context.payload as GlobalPayload
    const settings = (await globalPayload.findGlobal({ slug: 'settings', depth: 0, req: context.req })) as Record<string, unknown>
    const currentTerminology = objectOf(settings.terminology)
    const currentModules = objectOf(settings.modules)
    const applied = Array.isArray(settings.appliedTemplates)
      ? settings.appliedTemplates.filter((entry): entry is { key: string; version: number } => {
          const value = objectOf(entry)
          return typeof value.key === 'string' && typeof value.version === 'number'
        })
      : []
    const nextApplied = applied.some((entry) => entry.key === template.key && entry.version === template.version)
      ? applied
      : [...applied, { key: template.key, version: template.version }]
    await globalPayload.updateGlobal({
      slug: 'settings',
      data: {
        modules: { ...currentModules, ...template.modules },
        terminology: { ...currentTerminology, ...template.terminology },
        appliedTemplates: nextApplied,
      },
      overrideAccess: true,
      req: context.req,
    })
    for (const path of ['/settings', '/settings/fields', '/settings/views', '/settings/workflows', '/tasks', '/leads', '/deals'])
      revalidatePath(path)
    return { ok: true, key: template.key }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to apply the business preset.' }
  }
}
