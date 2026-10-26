import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, type Doc } from './documents'

interface ContactIdentity {
  readonly email: string
  readonly phone: string
}

function contactIdentity(data: Readonly<Record<string, unknown>>): ContactIdentity {
  const email = typeof data['email'] === 'string' ? data['email'].trim().toLowerCase() : ''
  const phone = typeof data['phone'] === 'string' ? data['phone'].replace(/\D/g, '') : ''
  return { email, phone }
}

function contactMatches(doc: Doc, identity: ContactIdentity): boolean {
  const email: unknown = fieldOf(doc, 'email')
  const phone: unknown = fieldOf(doc, 'phone')
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const normalizedPhone = typeof phone === 'string' ? phone.replace(/\D/g, '') : ''
  return (
    (identity.email !== '' && normalizedEmail === identity.email) ||
    (identity.phone !== '' && normalizedPhone === identity.phone)
  )
}

async function leadPages(payload: Payload): Promise<Doc[]> {
  const pageSize = 100
  let totalPages = 1
  const docs: Doc[] = []
  for (let page = 1; page <= totalPages; page += 1) {
    const result = await payload.find({
      collection: COLLECTIONS.leads,
      limit: pageSize,
      page,
      depth: 0,
      sort: 'createdAt',
      overrideAccess: true,
      select: { id: true, email: true, phone: true, owner: true, assignees: true },
    })
    totalPages = Math.max(totalPages, result.totalPages)
    docs.push(...result.docs)
  }
  return docs
}

/** Reuses one uniquely matching lead by normalized email or phone, retaining its routing fields. */
export async function findLeadByContact(
  payload: Payload,
  data: Readonly<Record<string, unknown>>,
): Promise<Doc | undefined> {
  const identity = contactIdentity(data)
  if (identity.email === '' && identity.phone === '') return undefined
  const matches = (await leadPages(payload)).filter((doc) => contactMatches(doc, identity))
  const ids = new Set(
    matches.flatMap((doc) => {
      const id = idOf(fieldOf(doc, 'id'))
      return id === undefined ? [] : [id]
    }),
  )
  if (ids.size !== 1) return undefined
  const id = ids.values().next().value
  return matches.find((doc) => idOf(fieldOf(doc, 'id')) === id)
}

/** Resolves the persisted submission-to-lead link before the lead's intake marker. */
export async function findLeadBySubmission(payload: Payload, submissionId: string): Promise<Doc | undefined> {
  const submissions = await payload.find({
    collection: COLLECTIONS.intakeSubmissions,
    where: { id: { equals: submissionId } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { recordId: true },
  })
  const linkedId = idOf(fieldOf(submissions.docs.at(0) ?? {}, 'recordId'))
  if (linkedId !== undefined) {
    const linked = await payload.find({
      collection: COLLECTIONS.leads,
      where: { id: { equals: linkedId } },
      limit: 1,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    const linkedLead = linked.docs.at(0)
    if (linkedLead !== undefined) return linkedLead
  }
  const direct = await payload.find({
    collection: COLLECTIONS.leads,
    where: { intakeSubmissionId: { equals: submissionId } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return direct.docs.at(0)
}
