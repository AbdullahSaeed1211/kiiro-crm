import type { Metadata } from 'next'
import { deleteConfiguration, saveConfiguration } from '../../../../server/actions/settings'
import { requireRole } from '../../../../server/auth/context'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { WorkflowEditor } from './workflow-editor'

export const metadata: Metadata = { title: 'Workflows' }
export const dynamic = 'force-dynamic'

const CATEGORIES = new Set(['backlog', 'open', 'active', 'waiting', 'done_success', 'done_failure', 'cancelled'])
const COLORS = new Set(['gray', 'blue', 'green', 'amber', 'red', 'violet', 'teal', 'pink'])
const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback

export default async function WorkflowsSettingsPage() {
  const context = await requireRole('owner', 'manager')
  const result = await context.payload.find({
    collection: 'workflows',
    sort: 'recordType',
    pagination: false,
    depth: 0,
    req: context.req,
  })
  const workflows = result.docs.flatMap((doc) => {
    const recordType = stringValue(doc.recordType)
    const stages = Array.isArray(doc.stages)
      ? doc.stages.flatMap((row, position) => {
          const stage = row as Record<string, unknown>
          const category = stringValue(stage.category)
          if (!CATEGORIES.has(category)) return []
          return [
            {
              id: stringValue(stage.id, `stage-${String(position)}`),
              name: stringValue(stage.name),
              category,
              color: COLORS.has(stringValue(stage.color)) ? stringValue(stage.color) : 'gray',
              position,
              ...(typeof stage.probability === 'number' ? { probability: stage.probability } : {}),
            },
          ]
        })
      : []
    return [
      {
        id: doc.id,
        recordType,
        name: stringValue(doc.name),
        stages,
        defaultStageId: stringValue(
          doc.defaultStageId,
          stages.find((stage) => !['done_success', 'done_failure', 'cancelled'].includes(stage.category))?.id ?? '',
        ),
      },
    ]
  })
  return (
    <SettingsPage
      title="Workflows"
      description="Define stages, defaults, and probabilities for each record type."
      roles={['owner', 'manager']}
    >
      <SettingsForm>
        <p className="text-sm text-muted-foreground">
          Every workflow is independent, so a sales pipeline, service queue, or project board can use language that fits
          the business.
        </p>
        <WorkflowEditor workflows={workflows} action={saveConfiguration} deleteAction={deleteConfiguration} />
      </SettingsForm>
    </SettingsPage>
  )
}
