const PHRASES: Readonly<Record<string, string>> = {
  'record.created': 'Created',
  'record.archived': 'Archived',
  'record.restored': 'Restored from the archive',
  'record.converted': 'Converted',
  'field.changed': 'Edited',
  'stage.changed': 'Moved to another stage',
  'assignment.changed': 'Assigned to someone else',
  'comment.added': 'Note added',
  'mention.added': 'Someone was mentioned',
  'attachment.added': 'File attached',
  'attachment.downloaded': 'File downloaded',
  'email.sent': 'Email sent',
  'email.received': 'Email received',
  'relation.linked': 'Linked to another record',
}

/** What an activity entry's verb means, in words for a person. */
export function describeActivity(verb: string | null): string {
  return (verb === null ? undefined : PHRASES[verb]) ?? 'Updated'
}

/** Every verb the log can show, for the filter list. */
export const ACTIVITY_VERBS: readonly string[] = Object.keys(PHRASES)
