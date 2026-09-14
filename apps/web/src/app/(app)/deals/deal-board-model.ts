import type { KanbanMoveResult } from '@ops/ui/composites/KanbanBoard'

/** Resolves a deferred lost drop without reporting the intentional deferral as a move failure. */
export function deferredLostMoveResult(sourceStageId: string, expectedUpdatedAt: number): KanbanMoveResult {
  return { ok: true, data: { stageId: sourceStageId, updatedAt: expectedUpdatedAt } }
}
