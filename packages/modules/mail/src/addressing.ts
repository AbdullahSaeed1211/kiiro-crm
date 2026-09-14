import type { InboundDestination, MailRecordRef, RecordAddressing, RecordAddressingOptions } from './contracts'
function base32(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let buffer = 0
  let result = ''
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      result += alphabet.charAt((buffer >>> (bits - 5)) & 31)
      bits -= 5
    }
  }
  if (bits > 0) result += alphabet.charAt((buffer << (5 - bits)) & 31)
  return result
}
/** Creates deterministic `r-<token>` addresses using tenant-scoped HMAC. */
export function createRecordAddressing(
  options: RecordAddressingOptions,
  resolveRecord: (token: string) => Promise<MailRecordRef | undefined>,
): RecordAddressing {
  const encoder = new TextEncoder()
  const keyPromise = crypto.subtle.importKey(
    'raw',
    encoder.encode(options.tenantSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const tokenFor = async (record: MailRecordRef): Promise<string> => {
    const signature = await crypto.subtle.sign('HMAC', await keyPromise, encoder.encode(`${record.type}:${record.id}`))
    return base32(new Uint8Array(signature)).slice(0, 16)
  }
  const platform = options.platformDomain !== undefined && options.tenantSlug !== undefined
  const prefix = platform ? `${options.tenantSlug}--` : ''
  const host = platform ? `in.${options.platformDomain}` : options.inboundDomain
  return { recordAddress: async (record) => `${prefix}r-${await tokenFor(record)}@${host}`, resolveRecord }
}
/** Resolves record token and intake aliases, defaulting to quarantine. */
export async function resolveInboundDestination(
  local: string,
  store: {
    findRecordByAddressToken(token: string): Promise<MailRecordRef | undefined>
    findIntakeFormByAlias(alias: string): Promise<{ readonly id: string; readonly active: boolean } | undefined>
  },
): Promise<InboundDestination> {
  if (local.startsWith('r-') && local.length > 2) {
    const record = await store.findRecordByAddressToken(local.slice(2))
    return record === undefined ? { kind: 'quarantine' } : { kind: 'record', record }
  }
  const form = await store.findIntakeFormByAlias(local)
  return form?.active === true ? { kind: 'intake', formId: form.id } : { kind: 'quarantine' }
}
