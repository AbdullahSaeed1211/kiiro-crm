'use server'

import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { isValidUnsubscribeToken } from '../newsletter/token'
import { NEWSLETTER_FIELD_KEY } from '../newsletter/subscribers'

const text = (form: FormData, key: string): string => {
  const value = form.get(key)
  return typeof value === 'string' ? value : ''
}

/** Public: a signed link is the only credential, so this checks the token before it touches the contact. */
export async function unsubscribeContact(form: FormData): Promise<void> {
  const contactId = text(form, 'contactId')
  const token = text(form, 'token')
  const payload = await getPayload({ config })
  if (contactId === '' || !(await isValidUnsubscribeToken(payload.secret, contactId, token)))
    redirect(`/unsubscribe/${contactId}/${token}?done=invalid`)
  const contact = await payload.findByID({ collection: 'contacts', id: contactId, depth: 0, overrideAccess: true })
  const customData =
    typeof contact.customData === 'object' && contact.customData !== null && !Array.isArray(contact.customData)
      ? contact.customData
      : {}
  await payload.update({
    collection: 'contacts',
    id: contactId,
    data: { customData: { ...customData, [NEWSLETTER_FIELD_KEY]: false } },
    overrideAccess: true,
  })
  redirect(`/unsubscribe/${contactId}/${token}?done=1`)
}
