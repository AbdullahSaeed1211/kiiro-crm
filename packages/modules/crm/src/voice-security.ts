import type { VoiceOffer } from './voice-contracts'

const encoder = new TextEncoder()
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    asArrayBuffer(encoder.encode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  )
}

async function signedToken(secret: string, payload: Record<string, unknown>): Promise<string> {
  const key = await hmacKey(secret, 'sign')
  const body = base64url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', key, asArrayBuffer(encoder.encode(body)))
  return `${body}.${base64url(new Uint8Array(signature))}`
}

/** Verifies an opaque offer or call authorization without trusting decoded client metadata. */
export async function verifySignedToken(secret: string, token: string): Promise<Record<string, unknown> | undefined> {
  if (token.length > 8192) return undefined
  const parts = token.split('.')
  if (parts.length !== 2) return undefined
  const [body = '', signature = ''] = parts
  try {
    const key = await hmacKey(secret, 'verify')
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      asArrayBuffer(unbase64url(signature)),
      asArrayBuffer(encoder.encode(body)),
    )
    return valid ? decodeRecord(unbase64url(body)) : undefined
  } catch {
    return undefined
  }
}

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  let encoded = btoa(binary).replaceAll('+', '-').replaceAll('/', '_')
  while (encoded.endsWith('=')) encoded = encoded.slice(0, -1)
  return encoded
}

function unbase64url(value: string): Uint8Array {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const result = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(result).set(bytes)
  return result
}

function decodeRecord(bytes: Uint8Array): Record<string, unknown> | undefined {
  const decoded: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  return isRecord(decoded) ? decoded : undefined
}

/** Signs the reviewed price and expiry of a provider number offer. */
export function signVoiceOffer(secret: string, offer: Omit<VoiceOffer, 'token'>): Promise<string> {
  return signedToken(secret, { ...offer, exp: offer.expiresAt })
}

/** Encodes signed call metadata in the standard base64 format accepted by Telnyx. */
export async function signVoiceClientState(secret: string, payload: Record<string, unknown>): Promise<string> {
  const sig = await signedToken(secret, payload)
  const bytes = encoder.encode(JSON.stringify({ ...payload, sig }))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Returns only the signed fields of a fresh authorization; malformed input is rejected without throwing. */
export async function verifyVoiceClientState(
  secret: string,
  encoded: string,
  now: number,
): Promise<Record<string, unknown> | undefined> {
  if (encoded.length > 8192) return undefined
  try {
    const record = decodeRecord(unbase64url(encoded))
    return record === undefined ? undefined : await verifyClientRecord(secret, record, now)
  } catch {
    return undefined
  }
}

async function verifyClientRecord(secret: string, record: Record<string, unknown>, now: number) {
  if (typeof record['sig'] !== 'string') return undefined
  const verified = await verifySignedToken(secret, record['sig'])
  if (verified === undefined) return undefined
  const expiresAt = verified['exp']
  if (typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return undefined
  return Object.entries(verified).every(([key, value]) => record[key] === value) ? verified : undefined
}

/** Restricts a verified parked authorization to its reserved call. */
export async function verifyParkedCallClientState(
  input: Readonly<{ secret: string; callId: string; encoded: string; now: number }>,
) {
  const verified = await verifyVoiceClientState(input.secret, input.encoded, input.now)
  return verified?.['callId'] === input.callId ? verified : undefined
}
