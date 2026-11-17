import { domainError, err, ok } from '@ops/kernel'
import type { Result } from '@ops/kernel'
import type { VoiceRuntime } from '@/server/voice/deps'
import { processVoiceEvents } from '@/server/voice/process'

/** Create a local inbound event and process it through the regular call engine. */
export async function simulateInbound(
  runtime: VoiceRuntime,
  numberId: string,
  from: string,
): Promise<Result<{ readonly accepted: true; readonly processed: number }>> {
  const number = await runtime.repo.getNumber(numberId)
  if (number?.status !== 'active' || !number.inboundEnabled)
    return err(domainError('NOT_FOUND', 'Choose an active simulator line.'))
  if (!(await runtime.repo.loadSettings()).enabled)
    return err(domainError('UNAVAILABLE', 'Enable calling settings before simulating an inbound call.'))
  const provider = runtime.provider
  if (provider === null) return err(domainError('UNAVAILABLE', 'Simulator provider is unavailable.'))
  const processed = await enqueueAndProcessInbound(runtime, { provider, to: number.e164, from })
  return ok({ accepted: true, processed })
}

async function enqueueAndProcessInbound(
  runtime: VoiceRuntime,
  input: { provider: NonNullable<VoiceRuntime['provider']>; to: string; from: string },
): Promise<number> {
  const now = Date.now()
  await runtime.repo.enqueueEvent({
    id: crypto.randomUUID(),
    eventKey: `sim-${crypto.randomUUID()}`,
    kind: 'call.initiated',
    occurredAt: now,
    receivedAt: now,
    payload: {
      call_control_id: `sim-caller-${crypto.randomUUID()}`,
      connection_id: runtime.appId || 'sim-app',
      from: input.from,
      to: input.to,
    },
    status: 'pending',
    attempts: 0,
    leaseUntil: null,
    error: null,
  })
  const result = await processVoiceEvents(
    {
      repo: runtime.repo,
      provider: input.provider,
      offerSigningSecret: runtime.offerSigningSecret,
      connectionId: runtime.connectionId,
      applicationId: runtime.appId || 'sim-app',
      now: Date.now,
      enqueueReconcile: () => Promise.resolve(),
    },
    10,
  )
  return result.processed
}
