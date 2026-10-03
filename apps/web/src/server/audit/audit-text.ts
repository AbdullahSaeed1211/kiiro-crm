const PHRASES: Readonly<Record<string, string>> = {
  'member.invited': 'Invited a person',
  'member.invitation_revoked': 'Cancelled an invitation',
  'member.invitation_resent': 'Sent an invitation again',
  'member.access_changed': 'Changed a person’s access',
  'group.saved': 'Saved a group',
  'group.deleted': 'Deleted a group',
  'token.created': 'Made an API token',
  'token.revoked': 'Revoked an API token',
  'settings.changed': 'Changed settings',
  'export.downloaded': 'Downloaded data',
}

/** Every event the security log can show, for its filter list. */
export const AUDIT_VERBS: readonly string[] = Object.keys(PHRASES)

/** What a security event means, in words for a person. */
export function describeAudit(verb: string): string {
  return PHRASES[verb] ?? 'Security event'
}
