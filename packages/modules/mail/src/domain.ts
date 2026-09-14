/* eslint-disable complexity, max-params -- inbound acceptance coordinates persistence and retryable side effects. */
import {
  domainError,
  err,
  ok,
  type DomainError,
  type ReceiveInboundDeps,
  type ReceiveInboundResult,
  type MailRecordRef,
  type MailTransport,
  type SystemEmailInput,
  type MailStore,
} from './contracts'
import { parseEmail } from './parser'
import { renderTemplate } from './templates'
import { resolveInboundDestination } from './addressing'

/** Receives one raw message, quarantining unknown destinations or untrusted senders. */
export async function receiveInboundEmail(
  deps: ReceiveInboundDeps,
): Promise<
  { readonly ok: true; readonly value: ReceiveInboundResult } | { readonly ok: false; readonly error: DomainError }
> {
  const parsed = await parsedOf(deps)
  const existing = await deps.store.findMessageByMessageId(parsed.messageId)
  if (existing !== undefined) {
    if (existing.record !== undefined && existing.status === 'received')
      await announce(deps, existing.record, existing.messageId)
    return duplicateResult(parsed.messageId, existing.status === 'quarantined', existing.record)
  }
  const local = deps.envelopeTo.split('@')[0]?.toLowerCase() ?? ''
  const destination = await resolveInboundDestination(local, deps.store)
  const intake = destination.kind === 'intake' ? await submitToIntake(deps, destination.formId, parsed) : undefined
  const record = intake?.recordRef ?? recordOf(destination)
  const accepted =
    destination.kind === 'intake' ? intake?.accepted === true : await acceptedSender(deps, parsed.from, record)
  const message = await createInboundMessage({ deps, parsed, accepted, record })
  if (accepted && record !== undefined) await announce(deps, record, message.messageId)
  return ok(receivedResult(parsed.messageId, accepted, record, destination))
}

function recordOf(destination: Awaited<ReturnType<typeof resolveInboundDestination>>): MailRecordRef | undefined {
  return destination.kind === 'record' ? destination.record : undefined
}
function receivedResult(
  messageId: string,
  accepted: boolean,
  record: MailRecordRef | undefined,
  destination: Awaited<ReturnType<typeof resolveInboundDestination>>,
): ReceiveInboundResult {
  if (!accepted || record === undefined)
    return { status: 'quarantined', messageId, destination: { kind: 'quarantine' } }
  return {
    status: 'received',
    messageId,
    destination: destination.kind === 'intake' ? destination : { kind: 'record', record },
  }
}

async function parsedOf(deps: ReceiveInboundDeps) {
  return deps.parse === undefined ? parseEmail(deps.raw) : deps.parse(deps.raw)
}
function duplicateResult(messageId: string, quarantined: boolean, record: MailRecordRef | undefined) {
  if (quarantined || record === undefined)
    return ok({ status: 'duplicate' as const, messageId, destination: { kind: 'quarantine' as const } })
  return ok({ status: 'duplicate' as const, messageId, destination: { kind: 'record' as const, record } })
}

async function submitToIntake(
  deps: ReceiveInboundDeps,
  formId: string,
  parsed: Awaited<ReturnType<typeof parseEmail>>,
): Promise<{ readonly accepted: boolean; readonly recordRef?: MailRecordRef }> {
  if (deps.intake === undefined) return { accepted: false }
  const result = await deps.intake.submit({
    formId,
    payload: {
      email: parsed.from || deps.envelopeFrom,
      subject: parsed.subject,
      message: parsed.textBody,
      ...(parsed.to[0] === undefined ? {} : { page: parsed.to[0] }),
    },
    receivedAt: deps.now,
  })
  if (!result.ok) return { accepted: false }
  return { accepted: true, ...(result.value.recordRef === undefined ? {} : { recordRef: result.value.recordRef }) }
}
async function createInboundMessage(input: {
  readonly deps: ReceiveInboundDeps
  readonly parsed: Awaited<ReturnType<typeof parseEmail>>
  readonly accepted: boolean
  readonly record: MailRecordRef | undefined
}) {
  return input.deps.store.createMessage({
    direction: 'inbound',
    ...(input.accepted && input.record !== undefined ? { record: input.record } : {}),
    messageId: input.parsed.messageId,
    ...(input.parsed.inReplyTo === undefined ? {} : { inReplyTo: input.parsed.inReplyTo }),
    from: input.deps.envelopeFrom || input.parsed.from,
    to: input.parsed.to.length === 0 ? [input.deps.envelopeTo] : input.parsed.to,
    cc: input.parsed.cc,
    subject: input.parsed.subject,
    textBody: input.parsed.textBody,
    attachmentIds: [],
    status: input.accepted ? 'received' : 'quarantined',
    occurredAt: input.deps.now,
  })
}

async function acceptedSender(
  deps: ReceiveInboundDeps,
  parsedFrom: string,
  record: MailRecordRef | undefined,
): Promise<boolean> {
  if (record === undefined) return false
  const sender = (deps.envelopeFrom || parsedFrom).trim().toLowerCase()
  return (await deps.store.senderMatchesRecord(sender, record)) || (await deps.store.senderMatchesActiveUser(sender))
}

async function announce(deps: ReceiveInboundDeps, record: MailRecordRef, messageId: string): Promise<void> {
  await deps.store.addActivityIfAbsent({ record, verb: 'email.received', messageId, occurredAt: deps.now })
  await deps.store.notifyIfAbsent({ record, type: 'email_received', messageId })
}

/** Releases a quarantined message only after manager authorization has been checked. */
export function releaseQuarantined(input: {
  readonly store: Pick<MailStore, 'releaseMessage'>
  readonly actorCanRelease: boolean
  readonly messageId: string
  readonly record: MailRecordRef
}): Promise<{ readonly ok: false; readonly error: DomainError } | { readonly ok: true; readonly value: undefined }> {
  if (!input.actorCanRelease)
    return Promise.resolve(err(domainError('FORBIDDEN', 'only managers can release quarantined mail')))
  return input.store.releaseMessage(input.messageId, input.record)
}

/** Sends one system notification with escaped HTML and a plain-text alternative. */
export function sendSystemEmail(
  sender: MailTransport,
  input: SystemEmailInput,
  from: string,
): Promise<
  | { readonly ok: true; readonly value: { readonly messageId: string } }
  | { readonly ok: false; readonly error: DomainError }
> {
  const rendered = renderTemplate(input)
  return sender.send({
    from,
    to: [input.recipient],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    ...(input.replyTo === undefined ? {} : { replyTo: input.replyTo }),
  })
}

/** Returns the local part format for a record address. */
export const recordAddressLocal = (token: string): string => `r-${token}`
