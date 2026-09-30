'use server'

import { asId } from '@ops/kernel'
import { crmDeps } from '../../container'

export interface ConversionOption {
  readonly id: string
  readonly name: string
}

export interface ConversionSuggestions {
  readonly organizations: readonly ConversionOption[]
  readonly contacts: readonly ConversionOption[]
}

/**
 * Searches for organizations and contacts matching a query.
 * Returns up to 10 of each that the actor can see.
 */
export async function searchConversionOptions(input: {
  readonly query: string
}): Promise<{ ok: true; data: ConversionSuggestions } | { ok: false; error: { message: string } }> {
  try {
    const deps = await crmDeps()
    const query = input.query.toLowerCase().trim()

    if (!query) {
      return { ok: true, data: { organizations: [], contacts: [] } }
    }

    const [organizations, contacts] = await Promise.all([deps.repo.list('organization'), deps.repo.list('contact')])

    const matchedOrgs = organizations
      .filter((org) => isMatchingOrganization(org, query))
      .slice(0, 10)
      .map((org) => ({ id: org.id, name: org.name }))

    const matchedContacts = contacts
      .filter((contact) => isMatchingContact(contact, query))
      .slice(0, 10)
      .map((contact) => ({ id: contact.id, name: getContactName(contact) }))

    return { ok: true, data: { organizations: matchedOrgs, contacts: matchedContacts } }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to search conversion options',
      },
    }
  }
}

function findSuggestedMatches(
  organizations: readonly { id: string; name: string }[],
  contacts: readonly { id: string; email: string | null; firstName: string | null; lastName: string | null }[],
  lead: { companyName: string | null; email: string | null },
): ConversionSuggestions {
  const organizations_result: ConversionOption[] = []
  const contacts_result: ConversionOption[] = []

  const companyName = lead.companyName
  if (companyName !== null) {
    const matchedOrgs = organizations.filter((org) => org.name.toLowerCase() === companyName.toLowerCase())
    organizations_result.push(...matchedOrgs.map((org) => ({ id: org.id, name: org.name })))
  }

  if (lead.email !== null) {
    const matchedContacts = contacts.filter((contact) => contact.email === lead.email)
    contacts_result.push(...matchedContacts.map((contact) => ({ id: contact.id, name: getContactName(contact) })))
  }

  return { organizations: organizations_result, contacts: contacts_result }
}

/**
 * Finds suggested matches for a lead based on email and company name.
 * Returns contact(s) with matching email and organization(s) with matching name.
 */
export async function suggestedMatches(input: {
  readonly leadId: string
}): Promise<{ ok: true; data: ConversionSuggestions } | { ok: false; error: { message: string } }> {
  try {
    const deps = await crmDeps()
    const lead = await deps.repo.get('lead', asId(input.leadId))

    if (!lead) {
      return { ok: false, error: { message: 'Lead not found' } }
    }

    const [organizations, contacts] = await Promise.all([deps.repo.list('organization'), deps.repo.list('contact')])

    const data = findSuggestedMatches(organizations, contacts, lead)
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to find suggested matches',
      },
    }
  }
}

function isMatchingOrganization(org: { name: string; email: string | null }, query: string): boolean {
  return org.name.toLowerCase().includes(query) || (org.email?.toLowerCase().includes(query) ?? false)
}

function isMatchingContact(
  contact: { firstName: string | null; lastName: string | null; email: string | null },
  query: string,
): boolean {
  const fullName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.toLowerCase()
  return fullName.includes(query) || (contact.email?.toLowerCase().includes(query) ?? false)
}

function getContactName(contact: { firstName: string | null; lastName: string | null; email: string | null }): string {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null
  return name ?? contact.email ?? 'Unknown'
}
