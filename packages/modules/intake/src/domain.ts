import { domainError, type DomainError, type IntakeForm, type IntakePayload } from './contracts'

const MAX_PAYLOAD_BYTES = 16 * 1024

/** Returns a SHA-256 digest as lowercase hexadecimal. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Normalizes a browser origin to its serialized origin. */
export function normalizeOrigin(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined
  } catch {
    return undefined
  }
}

/** Tests exact origin membership. Wildcards are not supported. */
export function isAllowedOrigin(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  const normalized = normalizeOrigin(origin)
  return normalized !== undefined && allowedOrigins.some((allowed) => normalizeOrigin(allowed) === normalized)
}

/** Validates the bounded public payload and requires an email or phone contact method. */
export function validateIntakePayload(
  payload: unknown,
): { readonly ok: true; readonly value: IntakePayload } | { readonly ok: false; readonly error: DomainError } {
  if (!isPayloadObject(payload))
    return { ok: false, error: domainError('VALIDATION', 'intake payload must be an object') }
  if (!isPayloadSmall(payload)) return { ok: false, error: domainError('VALIDATION', 'intake payload exceeds 16 KB') }
  const value = payload as IntakePayload
  const email = typeof value['email'] === 'string' ? value['email'].trim() : ''
  const phone = typeof value['phone'] === 'string' ? value['phone'].trim() : ''
  return email !== '' || phone !== ''
    ? { ok: true, value }
    : { ok: false, error: domainError('VALIDATION', 'email or phone is required') }
}

function isPayloadObject(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
}

function isPayloadSmall(payload: Record<string, unknown>): boolean {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).byteLength <= MAX_PAYLOAD_BYTES
  } catch {
    return false
  }
}

/** Builds the stable same-contact, same-day dedupe key. */
export async function intakeDedupeKey(formId: string, payload: IntakePayload, localDate: string): Promise<string> {
  const email = typeof payload['email'] === 'string' ? payload['email'].trim().toLowerCase() : ''
  const phone = typeof payload['phone'] === 'string' ? payload['phone'].replace(/\D/g, '') : ''
  const identity = email !== '' ? email : phone
  const message = typeof payload['message'] === 'string' ? payload['message'] : ''
  return sha256Hex(`${formId}:${identity}:${message}:${localDate}`)
}

/** Maximum serialized payload size accepted by the command. */
export const INTAKE_PAYLOAD_MAX_BYTES = MAX_PAYLOAD_BYTES

/** Reads one optional text field from an intake payload. */
export function text(payload: IntakePayload, key: string): string | undefined {
  const value = payload[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/** Derives a stable lead title from accepted base fields. */
export function titleOf(payload: IntakePayload): string {
  const fullName = [text(payload, 'firstName'), text(payload, 'lastName')].filter(Boolean).join(' ')
  return (
    text(payload, 'name') ??
    (fullName !== '' ? fullName : undefined) ??
    text(payload, 'company') ??
    text(payload, 'subject') ??
    text(payload, 'email') ??
    text(payload, 'phone') ??
    'New lead'
  )
}

/** Applies a form field map to the lead draft and custom data. */
export function mappedLead(form: IntakeForm, payload: IntakePayload): Readonly<Record<string, unknown>> {
  const lead: Record<string, unknown> = {
    title: titleOf(payload),
    ownerId: form.defaultOwnerId,
    assigneeIds: form.defaultAssigneeIds,
    sourceId: form.defaultSourceId,
  }
  const customData: Record<string, unknown> = {}
  for (const [incoming, target] of Object.entries(form.fieldMap)) {
    if (target === 'ignore' || payload[incoming] === undefined) continue
    if (target.startsWith('custom:')) customData[target.slice('custom:'.length)] = payload[incoming]
    else lead[target] = payload[incoming]
  }
  if (Object.keys(customData).length > 0) lead['customData'] = customData
  return Object.fromEntries(Object.entries(lead).filter(([, value]) => value !== undefined))
}
