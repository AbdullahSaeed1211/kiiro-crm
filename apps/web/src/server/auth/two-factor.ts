import { generateTotpSecret, matchRecoveryCode, newRecoveryCodes, otpauthUri, verifyTotp } from '@ops/module-identity'
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '../../payload-types'

const MAX_FAILURES = 5
const LOCK_MS = 10 * 60 * 1000
const CONTEXT = { authOperation: 'twoFactor' } as const

/** What the Local API needs to read and write the hidden two-step fields of one user. */
interface Target {
  readonly payload: Payload
  readonly userId: string
  readonly req?: PayloadRequest
}

interface TwoFactorState {
  readonly enabled: boolean
  readonly secret: string | null
  readonly recovery: readonly string[]
  readonly failures: number
  readonly lockedUntil: number
}

async function seal(secret: string, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await keyFor(secret),
    new TextEncoder().encode(plain),
  )
  return `${btoa(String.fromCodePoint(...iv))}.${btoa(String.fromCodePoint(...new Uint8Array(cipher)))}`
}

async function unseal(secret: string, sealed: string): Promise<string> {
  const [iv = '', body = ''] = sealed.split('.')
  const bytes = (text: string): Uint8Array<ArrayBuffer> =>
    Uint8Array.from(atob(text), (char) => char.codePointAt(0) ?? 0)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv) }, await keyFor(secret), bytes(body))
  return new TextDecoder().decode(plain)
}

/** The sealing key comes from the tenant's own Payload secret, so a copy of the database alone cannot read the secrets. */
async function keyFor(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`two-factor:${secret}`))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function read(target: Target): Promise<TwoFactorState> {
  const user: User = await target.payload.findByID({
    collection: 'users',
    id: target.userId,
    depth: 0,
    overrideAccess: true,
    ...(target.req === undefined ? {} : { req: target.req }),
  })
  const recovery = Array.isArray(user.totpRecovery) ? user.totpRecovery.filter((x) => typeof x === 'string') : []
  return {
    enabled: user.totpEnabled === true,
    secret: typeof user.totpSecret === 'string' ? user.totpSecret : null,
    recovery,
    failures: typeof user.totpFailures === 'number' ? user.totpFailures : 0,
    lockedUntil: typeof user.totpLockedUntil === 'number' ? user.totpLockedUntil : 0,
  }
}

async function write(target: Target, data: Record<string, unknown>): Promise<void> {
  await target.payload.update({
    collection: 'users',
    id: target.userId,
    data,
    depth: 0,
    overrideAccess: true,
    // No `req` here: a request that already carries a user would not take this context, and the user update guard
    // looks for it to let only these fields through.
    context: CONTEXT,
  })
}

/** Whether this user signs in with a code. */
export async function twoFactorEnabled(target: Target): Promise<boolean> {
  return (await read(target)).enabled
}

/** Starts setup: a new secret kept sealed and not yet active, and the address and key to add to an authenticator app. */
export async function beginTwoFactor(
  target: Target & { readonly account: string; readonly issuer: string },
): Promise<{ readonly secret: string; readonly uri: string }> {
  const secret = generateTotpSecret()
  await write(target, { totpSecret: await seal(target.payload.secret, secret), totpEnabled: false })
  return { secret, uri: otpauthUri({ secret, account: target.account, issuer: target.issuer }) }
}

/** Finishes setup when the app's first code is right: switches the step on and returns the one-time recovery codes. */
export async function confirmTwoFactor(target: Target & { readonly code: string }): Promise<string[] | null> {
  const state = await read(target)
  if (state.enabled || state.secret === null) return null
  const secret = await unseal(target.payload.secret, state.secret)
  if (!(await verifyTotp(secret, target.code, Date.now()))) return null
  const recovery = await newRecoveryCodes()
  await write(target, { totpEnabled: true, totpRecovery: recovery.hashes, totpFailures: 0, totpLockedUntil: null })
  return recovery.plain
}

/** Switches the step off and forgets the secret and recovery codes. */
export async function removeTwoFactor(target: Target): Promise<void> {
  await write(target, {
    totpEnabled: false,
    totpSecret: null,
    totpRecovery: [],
    totpFailures: 0,
    totpLockedUntil: null,
  })
}

export type CodeCheck = 'ok' | 'wrong' | 'locked'

async function accepted(target: Target, state: TwoFactorState, code: string): Promise<boolean> {
  if (state.secret !== null && (await verifyTotp(await unseal(target.payload.secret, state.secret), code, Date.now())))
    return true
  const used = await matchRecoveryCode(code, state.recovery)
  if (used === null) return false
  await write(target, { totpRecovery: state.recovery.filter((hash) => hash !== used) })
  return true
}

/**
 * Checks a sign-in code (an authenticator code or a recovery code). Five wrong codes in a row lock the step for ten
 * minutes, so a stolen password cannot be used to guess codes.
 */
export async function checkTwoFactorCode(target: Target & { readonly code: string }): Promise<CodeCheck> {
  const state = await read(target)
  if (state.lockedUntil > Date.now()) return 'locked'
  if (await accepted(target, state, target.code)) {
    if (state.failures > 0) await write(target, { totpFailures: 0, totpLockedUntil: null })
    return 'ok'
  }
  const failures = state.failures + 1
  await write(
    target,
    failures >= MAX_FAILURES ? { totpFailures: 0, totpLockedUntil: Date.now() + LOCK_MS } : { totpFailures: failures },
  )
  return failures >= MAX_FAILURES ? 'locked' : 'wrong'
}
