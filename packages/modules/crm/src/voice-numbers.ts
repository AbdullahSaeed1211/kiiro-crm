import type { VoiceNumber, VoiceOffer, VoiceSettings } from './voice-contracts'
import type { VoiceOperation } from './voice-contracts'
import type { VoiceProvider } from './ports/voice-provider'
import {
  voiceNumberPurchaseSchema,
  voiceNumberSearchSchema,
  voiceNumberUpdateSchema,
  voiceSettingsSchema,
} from './voice-schema'
import {
  canManage,
  conflict,
  forbidden,
  parse,
  unavailable,
  type VoiceEngineDeps,
  type VoiceResult,
} from './voice-core'
import { signVoiceOffer, verifySignedToken } from './voice-security'
import { domainError, err, ok } from '@ops/kernel'

/** Search and sign short-lived US number offers for an authorized manager. */
export async function searchVoiceNumbers(
  deps: VoiceEngineDeps,
  input: unknown,
): Promise<VoiceResult<readonly VoiceOffer[]>> {
  const parsed = parse(voiceNumberSearchSchema, input)
  if (!parsed.ok) return parsed
  if (!canManage(deps.actor.role)) return forbidden()
  const provider = telnyxProvider(deps)
  if (provider === undefined) return unavailable()
  const offers = await provider.searchNumbers(parsed.value)
  return ok(await Promise.all(offers.map((offer) => signOffer(deps, offer))))
}

async function signOffer(deps: VoiceEngineDeps, offer: VoiceOffer): Promise<VoiceOffer> {
  const data = {
    e164: offer.e164,
    region: offer.region,
    monthlyCost: offer.monthlyCost,
    setupCost: offer.setupCost,
    expiresAt: offer.expiresAt,
  }
  return { ...data, token: await signVoiceOffer(deps.offerSigningSecret, data) }
}

/** Purchase a signed number offer with one durable idempotency key. */
export async function purchaseVoiceNumber(deps: VoiceEngineDeps, input: unknown): Promise<VoiceResult<VoiceNumber>> {
  const parsed = parse(voiceNumberPurchaseSchema, input)
  if (!parsed.ok) return parsed
  if (!canManage(deps.actor.role)) return forbidden()
  const provider = telnyxProvider(deps)
  if (provider === undefined) return unavailable()
  return executePurchase({ deps, provider, token: parsed.value.offerToken, key: parsed.value.requestKey })
}

async function executePurchase({
  deps,
  provider,
  token,
  key,
}: {
  deps: VoiceEngineDeps
  provider: VoiceProvider
  token: string
  key: string
}): Promise<VoiceResult<VoiceNumber>> {
  const offer = await verifySignedToken(deps.offerSigningSecret, token)
  if (!isValidOffer(offer, deps.now())) return conflict('This number offer expired. Search again before purchasing.')
  const userId = String(deps.actor.id)
  const prior = await deps.repo.getOperation(userId, key)
  if (prior !== undefined) return priorPurchase(deps, prior)
  const operation = await reserveNumberOperation(deps, { userId, key, e164: offer.e164 })
  if (operation.id !== operation.operationId) return conflict('This purchase is already being processed.')
  return completePurchase({
    deps,
    provider,
    operation,
    offer: {
      token,
      e164: offer.e164,
      region: offer.region,
      monthlyCost: offer.monthlyCost,
      setupCost: offer.setupCost,
      expiresAt: offer.expiresAt,
    },
    key,
  })
}

interface ReservedOperation {
  readonly id: string
  readonly operationId: string
}

async function reserveNumberOperation(
  deps: VoiceEngineDeps,
  input: { userId: string; key: string; e164: string },
): Promise<ReservedOperation> {
  const operationId = crypto.randomUUID()
  const operation = await deps.repo.reserveOperation({
    id: operationId,
    key: input.key,
    kind: 'purchase',
    userId: input.userId,
    numberId: null,
    e164: input.e164,
    status: 'pending',
    providerOrderId: null,
    createdAt: deps.now(),
    updatedAt: deps.now(),
  })
  return { id: operation.id, operationId }
}

async function priorPurchase(deps: VoiceEngineDeps, operation: VoiceOperation): Promise<VoiceResult<VoiceNumber>> {
  if (operation.status !== 'complete')
    return conflict('This purchase is still being reconciled. Do not retry with a new request key.')
  const number = operation.numberId === null ? undefined : await deps.repo.getNumber(operation.numberId)
  return number === undefined ? conflict('The previous purchase is being reconciled.') : ok(number)
}

async function completePurchase({
  deps,
  provider,
  operation,
  offer,
  key,
}: {
  deps: VoiceEngineDeps
  provider: VoiceProvider
  operation: ReservedOperation
  offer: VoiceOffer
  key: string
}): Promise<VoiceResult<VoiceNumber>> {
  try {
    const result = await provider.purchaseNumber({ offer, requestKey: key })
    const number = purchasedNumber(deps, result)
    await deps.repo.saveNumber(number)
    await deps.repo.updateOperation(operation.id, {
      status: 'complete',
      numberId: number.id,
      providerOrderId: result.orderId,
      updatedAt: deps.now(),
    })
    return ok(number)
  } catch {
    await deps.repo.updateOperation(operation.id, { status: 'uncertain', updatedAt: deps.now() })
    return conflict('Telnyx did not confirm the purchase. Check reconciliation before retrying.')
  }
}

function purchasedNumber(
  deps: VoiceEngineDeps,
  result: Awaited<ReturnType<VoiceProvider['purchaseNumber']>>,
): VoiceNumber {
  return {
    id: crypto.randomUUID(),
    e164: result.e164,
    label: result.e164,
    assigneeIds: [],
    status: result.status,
    inboundEnabled: true,
    outboundEnabled: true,
    recordingEnabled: false,
    providerNumberId: result.providerNumberId,
    providerOrderId: result.orderId,
    monthlyCost: result.monthlyCost,
    setupCost: result.setupCost,
    updatedAt: deps.now(),
  }
}

interface SignedOffer {
  readonly e164: string
  readonly exp: number
  readonly expiresAt: number
  readonly region: string
  readonly monthlyCost: string
  readonly setupCost: string
}

function isValidOffer(
  offer: Record<string, unknown> | undefined,
  now: number,
): offer is Record<string, unknown> & SignedOffer {
  return (
    typeof offer?.['e164'] === 'string' &&
    typeof offer['exp'] === 'number' &&
    offer['exp'] > now &&
    typeof offer['expiresAt'] === 'number' &&
    typeof offer['region'] === 'string' &&
    typeof offer['monthlyCost'] === 'string' &&
    typeof offer['setupCost'] === 'string'
  )
}

function telnyxProvider(deps: VoiceEngineDeps): VoiceProvider | undefined {
  return deps.configured && deps.mode === 'telnyx' && deps.provider?.mode === 'telnyx' ? deps.provider : undefined
}

/** Update routing assignments and capabilities for an owned phone number. */
export async function updateVoiceNumber(
  deps: VoiceEngineDeps,
  numberId: string,
  input: unknown,
): Promise<VoiceResult<VoiceNumber>> {
  const parsed = parse(voiceNumberUpdateSchema, input)
  if (!parsed.ok) return parsed
  if (!canManage(deps.actor.role)) return forbidden()
  const current = await deps.repo.getNumber(numberId)
  if (current === undefined) return err(domainError('NOT_FOUND', 'Number not found.'))
  if (!(await activeAssignees(deps, parsed.value.assigneeIds)))
    return err(domainError('VALIDATION', 'Every assignee must be an active workspace member.'))
  if ((parsed.value.inboundEnabled || parsed.value.outboundEnabled) && !deps.configured) return unavailable()
  const updated = { ...current, ...parsed.value, updatedAt: deps.now() }
  await deps.repo.saveNumber(updated)
  return ok(updated)
}

async function activeAssignees(deps: VoiceEngineDeps, assigneeIds: readonly string[]): Promise<boolean> {
  for (const id of assigneeIds) if (!(await deps.repo.isActiveUser(id))) return false
  return true
}

/** Save workspace call routing and concurrency settings. */
export async function updateVoiceSettings(deps: VoiceEngineDeps, input: unknown): Promise<VoiceResult<VoiceSettings>> {
  const parsed = parse(voiceSettingsSchema, input)
  if (!parsed.ok) return parsed
  if (!canManage(deps.actor.role)) return forbidden()
  if (parsed.value.enabled && !deps.configured) return unavailable()
  await deps.repo.saveSettings(parsed.value)
  return ok(parsed.value)
}

export { releaseVoiceNumber } from './voice-number-release'
