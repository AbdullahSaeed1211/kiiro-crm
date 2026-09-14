export const INVITATION_DAYS = 7

export function createInvitationToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashInvitationToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function invitationExpiresAt(now = Date.now()): number {
  return now + INVITATION_DAYS * 24 * 60 * 60 * 1000
}

export function invitationUsable(invitation: { status?: unknown; expiresAt?: unknown }, now = Date.now()): boolean {
  return invitation.status === 'pending' && typeof invitation.expiresAt === 'number' && invitation.expiresAt > now
}
