const encoder = new TextEncoder()

async function sign(secret: string, contactId: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`newsletter:${contactId}`))
  return btoa(String.fromCharCode(...new Uint8Array(mac)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

/** The token in a contact's unsubscribe link: an HMAC of the contact id, so no token is stored. */
export function unsubscribeToken(secret: string, contactId: string): Promise<string> {
  return sign(secret, contactId)
}

/** Compares in constant time over the whole token so a wrong link leaks nothing about the right one. */
export async function isValidUnsubscribeToken(secret: string, contactId: string, token: string): Promise<boolean> {
  const expected = await sign(secret, contactId)
  if (expected.length !== token.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1)
    difference |= expected.charCodeAt(index) ^ token.charCodeAt(index)
  return difference === 0
}
