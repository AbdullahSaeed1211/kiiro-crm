import {
  domainError,
  err,
  ok,
  type DomainError,
  type IntakeAccepted,
  type IntakePayload,
  type IntakeResult,
  type SubmitIntakeDeps,
} from './contracts'
import { intakeDedupeKey, isAllowedOrigin, mappedLead, sha256Hex, text, titleOf, validateIntakePayload } from './domain'

const failure = (code: DomainError['code'], message: string): IntakeResult => err(domainError(code, message))
async function checkChannel(
  deps: SubmitIntakeDeps,
): Promise<
  { readonly ok: true; readonly channel: 'web' | 'server' } | { readonly ok: false; readonly result: IntakeResult }
> {
  if (deps.serverKey !== undefined) {
    return serverChannel(deps)
  }
  if (!isAllowedOrigin(deps.origin, deps.form.allowedOrigins))
    return { ok: false, result: failure('FORBIDDEN', 'origin is not allowed') }
  return webChannel(deps)
}

async function webChannel(
  deps: SubmitIntakeDeps,
): Promise<{ readonly ok: true; readonly channel: 'web' } | { readonly ok: false; readonly result: IntakeResult }> {
  if (deps.production !== true && !deps.form.requireTurnstile) return { ok: true, channel: 'web' }
  const valid = await verifyWebTurnstile(deps)
  return valid
    ? { ok: true, channel: 'web' }
    : { ok: false, result: failure('FORBIDDEN', 'Turnstile verification failed') }
}

async function verifyWebTurnstile(deps: SubmitIntakeDeps): Promise<boolean> {
  const turnstile = deps.turnstile
  const token = deps.turnstileToken
  if (turnstile === undefined || token === undefined || token === '' || token.length > 2048) return false
  return turnstile.verify({
    token,
    ...(deps.remoteIp === undefined ? {} : { remoteIp: deps.remoteIp }),
    allowedHostnames: deps.turnstileHostnames ?? [],
  })
}

async function serverChannel(
  deps: SubmitIntakeDeps,
): Promise<{ readonly ok: true; readonly channel: 'server' } | { readonly ok: false; readonly result: IntakeResult }> {
  const hash = await sha256Hex(deps.serverKey ?? '')
  return deps.form.serverKeyHashes.includes(hash)
    ? { ok: true, channel: 'server' }
    : { ok: false, result: failure('FORBIDDEN', 'invalid intake server key') }
}

/** Validates, deduplicates, creates and announces one public lead intake submission. */
export async function submitIntake(deps: SubmitIntakeDeps, payload: unknown): Promise<IntakeResult> {
  const prepared = await prepare(deps, payload)
  if (!prepared.ok) return prepared.result
  const existing = await deps.store.findByDedupeKey(prepared.dedupeKey)
  if (existing !== undefined) return duplicate(deps.form.successMessage, existing.recordRef)
  return createAccepted(deps, prepared)
}

async function createAccepted(
  deps: SubmitIntakeDeps,
  prepared: { readonly channel: 'web' | 'server'; readonly payload: IntakePayload; readonly dedupeKey: string },
): Promise<IntakeResult> {
  const inserted = await deps.store.insertSubmission({
    formId: deps.form.id,
    channel: prepared.channel,
    receivedAt: deps.now,
    origin: deps.origin ?? '',
    ipHash: await sha256Hex(deps.remoteIp ?? ''),
    userAgent: deps.userAgent ?? '',
    payload: prepared.payload,
    dedupeKey: prepared.dedupeKey,
    status: 'accepted',
  })
  if (!inserted.ok) return err(inserted.error)
  if (inserted.value.status === 'duplicate') return duplicate(deps.form.successMessage, inserted.value.recordRef)
  const lead = await deps.store.createLead(mappedLead(deps.form, prepared.payload))
  const record = { type: 'lead' as const, id: lead.id }
  const message = text(prepared.payload, 'message')
  if (message !== undefined) await deps.store.addComment({ record, body: message })
  await deps.store.notify({
    userIds: deps.form.notifyUserIds,
    groupIds: deps.form.notifyGroupIds,
    record,
    title: titleOf(prepared.payload),
  })
  return ok({ status: 'accepted', message: deps.form.successMessage, recordRef: record })
}

async function prepare(
  deps: SubmitIntakeDeps,
  payload: unknown,
): Promise<
  | {
      readonly ok: true
      readonly channel: 'web' | 'server'
      readonly payload: IntakePayload
      readonly dedupeKey: string
    }
  | { readonly ok: false; readonly result: IntakeResult }
> {
  if (!deps.form.active) return { ok: false, result: failure('NOT_FOUND', 'intake form not found') }
  const limited = await deps.rateLimiter.check(`${await sha256Hex(deps.remoteIp ?? '')}:${deps.form.key}`)
  if (!limited) return { ok: false, result: failure('RATE_LIMITED', 'too many intake submissions') }
  const channel = await checkChannel(deps)
  if (!channel.ok) return channel
  const parsed = validateIntakePayload(payload)
  if (!parsed.ok) return { ok: false, result: err(parsed.error) }
  return {
    ok: true,
    channel: channel.channel,
    payload: parsed.value,
    dedupeKey: await intakeDedupeKey(deps.form.id, parsed.value, deps.localDate),
  }
}

function duplicate(
  message: string,
  recordRef: { readonly type: 'lead'; readonly id: string } | undefined,
): { readonly ok: true; readonly value: IntakeAccepted } {
  return { ok: true, value: { status: 'duplicate', message, ...(recordRef === undefined ? {} : { recordRef }) } }
}
