'use server'

import { emailTemplatesSchema, fillTemplate } from '@ops/module-mail'
import { asId } from '@ops/kernel'
import { actionError, actionOk, type ActionResult } from '../action-result'
import { getWorkspaceSettings, requireRole } from '../auth/context'
import { crmDeps } from '../container'

async function savedTemplates() {
  const settings = await getWorkspaceSettings()
  const parsed = emailTemplatesSchema.safeParse(settings.emailTemplates ?? [])
  return parsed.success ? parsed.data : []
}

/** The names of the workspace's email templates, for the picker in the email box. */
export async function listEmailTemplates(): Promise<{ id: string; name: string }[]> {
  await requireRole('owner', 'manager', 'staff')
  return (await savedTemplates()).map(({ id, name }) => ({ id, name }))
}

/** The first name a template greets: the contact's, or a lead's first name or first word of its title. */
async function firstNameOf(recordType: string, recordId: string): Promise<string> {
  if (recordType !== 'contact' && recordType !== 'lead') return 'there'
  const record = await (await crmDeps()).repo.get(recordType, asId(recordId))
  if (record === undefined) return 'there'
  const titleWord = recordType === 'lead' ? (record as { title: string }).title.split(/\s+/u)[0] : null
  const found = [record.firstName, titleWord]
    .map((word) => word?.trim())
    .find((word) => word !== undefined && word !== '')
  return found ?? 'there'
}

/** Fills a template for one record, ready to drop into the subject and message boxes. */
export async function applyEmailTemplate(input: {
  readonly id: string
  readonly recordType: string
  readonly recordId: string
}): Promise<ActionResult<{ subject: string; body: string }>> {
  await requireRole('owner', 'manager', 'staff')
  const template = (await savedTemplates()).find((candidate) => candidate.id === input.id)
  if (template === undefined) return actionError('NOT_FOUND', 'That template no longer exists.')
  const firstName = await firstNameOf(input.recordType, input.recordId)
  const values = { firstName, name: firstName }
  return actionOk({ subject: fillTemplate(template.subject, values), body: fillTemplate(template.body, values) })
}
