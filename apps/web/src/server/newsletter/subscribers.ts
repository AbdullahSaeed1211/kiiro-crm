import type { CrmDeps } from '@ops/module-crm'
import type { Subscriber } from './types'

/** Contacts opt in through this checkbox custom field (Settings, Fields); the newsletter reads it and nothing else. */
export const NEWSLETTER_FIELD_KEY = 'newsletter'

/** Contacts the actor can see who are opted in and have an email address. */
export async function listSubscribers(deps: CrmDeps): Promise<Subscriber[]> {
  const contacts = await deps.repo.list('contact')
  return contacts.flatMap((contact) =>
    contact.customData[NEWSLETTER_FIELD_KEY] === true && contact.email !== null
      ? [
          {
            id: contact.id,
            email: contact.email,
            name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
          },
        ]
      : [],
  )
}
