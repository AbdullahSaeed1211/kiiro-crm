import type { VoiceNumber } from './voice-contracts'
import type { VoiceProvider } from './ports/voice-provider'
import { voiceNumberReleaseSchema } from './voice-schema'
import {
  canManage,
  conflict,
  forbidden,
  parse,
  unavailable,
  type VoiceEngineDeps,
  type VoiceResult,
} from './voice-core'
import { domainError, err, ok } from '@ops/kernel'

/** Release a purchased number through a deduplicated provider operation. */
export async function releaseVoiceNumber(
  deps: VoiceEngineDeps,
  numberId: string,
  input: unknown,
): Promise<VoiceResult<{ released: true }>> {
  const parsed = parse(voiceNumberReleaseSchema, input)
  if (!parsed.ok) return parsed
  if (!canManage(deps.actor.role)) return forbidden()
  const number = await deps.repo.getNumber(numberId)
  if (number === undefined) return err(domainError('NOT_FOUND', 'Number not found.'))
  if (number.status === 'released') return ok({ released: true })
  const provider = telnyxProvider(deps)
  const providerNumberId = number.providerNumberId
  if (providerNumberId === null || provider === undefined) return unavailable()
  return executeRelease({ deps, provider, number: { ...number, providerNumberId }, key: parsed.value.requestKey })
}

async function executeRelease({
  deps,
  provider,
  number,
  key,
}: {
  deps: VoiceEngineDeps
  provider: VoiceProvider
  number: VoiceNumber & { providerNumberId: string }
  key: string
}): Promise<VoiceResult<{ released: true }>> {
  const userId = String(deps.actor.id)
  const prior = await deps.repo.getOperation(userId, key)
  if (prior?.status === 'complete') return ok({ released: true })
  if (prior !== undefined) return conflict('This release is still being reconciled.')
  const operation = await reserveReleaseOperation(deps, { userId, number, key })
  if (operation.id !== operation.idempotencyId) return conflict('This release is already being processed.')
  return completeRelease({ deps, provider, number, operation, key })
}

async function reserveReleaseOperation(
  deps: VoiceEngineDeps,
  input: { userId: string; number: VoiceNumber; key: string },
): Promise<{ id: string; idempotencyId: string }> {
  const id = crypto.randomUUID()
  const operation = await deps.repo.reserveOperation({
    id,
    key: input.key,
    kind: 'release',
    userId: input.userId,
    numberId: input.number.id,
    e164: input.number.e164,
    status: 'pending',
    providerOrderId: null,
    createdAt: deps.now(),
    updatedAt: deps.now(),
  })
  return { id: operation.id, idempotencyId: id }
}

async function completeRelease({
  deps,
  provider,
  number,
  operation,
  key,
}: {
  deps: VoiceEngineDeps
  provider: VoiceProvider
  number: VoiceNumber & { providerNumberId: string }
  operation: { id: string }
  key: string
}): Promise<VoiceResult<{ released: true }>> {
  try {
    await provider.releaseNumber({ providerNumberId: number.providerNumberId, requestKey: key })
    await deps.repo.saveNumber({
      ...number,
      status: 'released',
      inboundEnabled: false,
      outboundEnabled: false,
      updatedAt: deps.now(),
    })
    await deps.repo.updateOperation(operation.id, { status: 'complete', updatedAt: deps.now() })
    return ok({ released: true })
  } catch {
    await deps.repo.updateOperation(operation.id, { status: 'uncertain', updatedAt: deps.now() })
    return conflict('Telnyx did not confirm the release. Check reconciliation before retrying.')
  }
}

function telnyxProvider(deps: VoiceEngineDeps): VoiceProvider | undefined {
  return deps.configured && deps.mode === 'telnyx' && deps.provider?.mode === 'telnyx' ? deps.provider : undefined
}
