import type { Result } from '@ops/kernel'
import type { Workflow } from '@ops/platform'

/** Pages render through the error boundary when a record type has no workflow, as they did before ports returned Results. */
export function workflowOrThrow(result: Result<Workflow>): Workflow {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}
