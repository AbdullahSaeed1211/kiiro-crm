import type { StageStore, StageTransition } from '@ops/platform'
import type { CRM_FIELDS } from '../contracts/names'

type ActivityEntry = Parameters<StageStore['addActivity']>[0]
type TransitionField = (typeof CRM_FIELDS.stageTransition)[number]

/** Maps a platform stage transition to the persisted `stageTransitions` document shape. */
export function transitionData({ record, workflowId, ...rest }: StageTransition): Record<TransitionField, unknown> {
  return { recordType: record.type, recordId: record.id, workflow: workflowId, ...rest }
}

/** Maps a platform activity entry to the persisted `activity` document shape. */
export function activityData({ record, actorId, ...rest }: ActivityEntry): Record<string, unknown> {
  return { recordType: record.type, recordId: record.id, actor: actorId, ...rest }
}
