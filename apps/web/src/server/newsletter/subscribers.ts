import type { CrmDeps } from '@ops/module-crm'
import type { Subscriber } from './types'

/** Contacts opt in through this checkbox custom field (Settings, Fields); the newsletter reads it and nothing else. */
export const NEWSLETTER_FIELD_KEY = 'newsletter'
/** A multi-select custom field on contacts naming the audiences (lists) a subscriber belongs to. */
export const AUDIENCES_FIELD_KEY = 'audiences'

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

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
            audiences: textList(contact.customData[AUDIENCES_FIELD_KEY]),
          },
        ]
      : [],
  )
}

/** Everyone when no audience is named, otherwise only the subscribers in that audience. */
export function inAudience(subscribers: readonly Subscriber[], audience: string | undefined): Subscriber[] {
  return audience === undefined || audience === ''
    ? [...subscribers]
    : subscribers.filter((subscriber) => subscriber.audiences.includes(audience))
}
