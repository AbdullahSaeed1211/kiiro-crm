import { createJsonLogger } from '@ops/kernel'
import type { InternalForwardEnv } from '../contracts/worker'
import { postInternal } from './post-internal'

const logger = createJsonLogger()

/** Queue payloads contain references only; credentials and provider payloads stay in private storage. */
export type VoiceQueueJob = { kind: 'events' } | { kind: 'reconcile'; callId: string }

/** The acknowledgement surface used by the queue forwarder. */
interface VoiceQueueBatch {
  readonly messages: readonly {
    readonly id: string
    readonly body: unknown
    readonly attempts: number
    ack(): void
    retry(options: { delaySeconds: number }): void
  }[]
}

function isVoiceJob(body: unknown): body is VoiceQueueJob {
  if (typeof body !== 'object' || body === null || !('kind' in body)) return false
  if (body.kind === 'events') return Object.keys(body).length === 1
  if (body.kind !== 'reconcile' || Object.keys(body).length !== 2) return false
  return hasCallId(body)
}

function hasCallId(body: object): boolean {
  return 'callId' in body && typeof body.callId === 'string' && body.callId.length > 0 && body.callId.length <= 180
}

/** Acknowledge only completed work. Invalid jobs cannot improve with a retry. */
export async function dispatchVoiceQueue(batch: VoiceQueueBatch, env: InternalForwardEnv): Promise<void> {
  for (const message of batch.messages) {
    if (!isVoiceJob(message.body)) {
      logger.error('voice.invalid_queue_job', { messageId: message.id })
      message.ack()
      continue
    }
    try {
      const response = await postInternal(env, '/api/v1/internal/voice/process', {
        body: JSON.stringify(message.body),
        contentType: 'application/json',
      })
      if (!response.ok) throw new Error(`Voice processor returned ${String(response.status)}`)
      message.ack()
    } catch {
      logger.error('voice.queue_processing_failed', { messageId: message.id, attempts: message.attempts })
      message.retry({ delaySeconds: Math.min(300, 5 * 2 ** Math.min(message.attempts, 6)) })
    }
  }
}
