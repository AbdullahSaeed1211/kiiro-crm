import { systemVoiceRuntime } from './deps'
import type { CronJobOutcome } from '@ops/adapter-cloudflare'
import { reconcileVoiceNumbers } from './process'

/** Republishes bounded recovery work for inbox deliveries or active calls whose original queue job was lost. */
export async function enqueueVoiceRecovery(): Promise<CronJobOutcome> {
  const runtime = await systemVoiceRuntime()
  const queue = runtime.queue
  if (!runtime.configured || queue === undefined) return { processed: 0, created: 0, skipped: 1 }
  const calls = await runtime.repo.listOpenCalls(100)
  await queue.send({ kind: 'events' })
  await Promise.all(calls.map((call) => queue.send({ kind: 'reconcile', callId: call.id })))
  if (runtime.provider !== null) await reconcileVoiceNumbers({ repo: runtime.repo, provider: runtime.provider }, 5)
  return { processed: calls.length + 1, created: calls.length + 1, skipped: 0 }
}
