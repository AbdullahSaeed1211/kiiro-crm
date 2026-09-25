import type { ErrorCode } from '@ops/kernel'

/** Result of a task move, safe to return to the client. */
export type MoveTaskResult =
  | { readonly ok: true; readonly data: { readonly stageId: string; readonly updatedAt: number } }
  | { readonly ok: false; readonly error: { readonly code: ErrorCode; readonly message: string } }
