'use server'

import { revalidatePath } from 'next/cache'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { requireRole } from '../../auth/context'
import {
  INTAKE_KEY_PATTERN,
  parseIntakeFormSettings,
  randomServerKey,
  sha256Hex,
} from '../../../app/(app)/settings/intake/intake-validation'
import { formFieldsSchema } from '@ops/module-intake'
import { z } from 'zod'
import { recordOf, stringValue } from './input'

const INTAKE_PATH = '/settings/intake'

export async function createIntakeForm(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const key = stringValue(data.key)?.toLowerCase()
  const name = stringValue(data.name)
  if (key === undefined || name === undefined || !INTAKE_KEY_PATTERN.test(key))
    return actionError('VALIDATION', 'Name and a lowercase URL-safe key are required.')
  try {
    await context.payload.create({
      collection: 'intakeForms',
      data: {
        key,
        name,
        active: true,
        targetRecordType: 'lead',
        fieldMap: { name: 'title', email: 'email', phone: 'phone', company: 'companyName', message: 'notes' },
        allowedOrigins: [],
        requireTurnstile: true,
        serverKeyHashes: [],
        successMessage: 'Thanks. We will be in touch.',
      },
      req: context.req,
    })
    revalidatePath(INTAKE_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'createIntakeForm', 'Unable to create intake form.')
  }
}

export async function updateIntakeForm(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const id = stringValue(data.id)
  if (id === undefined) return actionError('VALIDATION', 'Intake form id is required.')
  const parsed = parseIntakeFormSettings(data)
  if (!parsed.ok) return actionError('VALIDATION', parsed.error)
  try {
    await context.payload.update({
      collection: 'intakeForms',
      id,
      data: parsed.data,
      req: context.req,
    })
    revalidatePath(INTAKE_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'updateIntakeForm', 'Unable to update intake form.')
  }
}

/** Adds a new hashed server credential and returns the plaintext exactly once for copying. */
export async function rotateIntakeServerKey(input: unknown): Promise<ActionResult<{ serverKey: string }>> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return actionError('VALIDATION', 'Intake form id is required.')
  try {
    const found = await context.payload.find({
      collection: 'intakeForms',
      where: { id: { equals: id } },
      limit: 1,
      depth: 0,
      req: context.req,
    })
    if (found.docs.length === 0) return actionError('NOT_FOUND', 'Intake form not found.')
    const form = found.docs[0]
    const currentHashes = Array.isArray(form.serverKeyHashes)
      ? form.serverKeyHashes.filter((hash): hash is string => typeof hash === 'string')
      : []
    const serverKey = randomServerKey()
    await context.payload.update({
      collection: 'intakeForms',
      id,
      data: { serverKeyHashes: [...currentHashes, await sha256Hex(serverKey)] },
      req: context.req,
    })
    revalidatePath(INTAKE_PATH)
    return actionOk({ serverKey })
  } catch (error) {
    return actionFailure(error, 'rotateIntakeServerKey', 'Unable to create server key.')
  }
}

const hostedFormSchema = z.looseObject({
  id: z.string().trim().min(1),
  fields: z.array(z.looseObject({ target: z.string().trim().min(1).max(80) })),
})

/** A question without its target: the target belongs to the field map, not to the stored question. */
const withoutTarget = (field: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(field).filter(([name]) => name !== 'target'))

/**
 * Saves the questions a hosted form shows and where each answer goes: the questions are stored as they are, and each
 * question's target is merged into the form's field map so the answers land on the lead.
 */
export async function saveIntakeFormFields(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const head = hostedFormSchema.safeParse(input)
  if (!head.success) return actionError('VALIDATION', 'Choose where each question is saved.')
  const questions = formFieldsSchema.safeParse(head.data.fields.map(withoutTarget))
  if (!questions.success) return actionError('VALIDATION', 'Give each question a label and its own short key.')
  try {
    const form = await context.payload.findByID({
      collection: 'intakeForms',
      id: head.data.id,
      depth: 0,
      req: context.req,
    })
    const current = recordOf(form.fieldMap)
    const targets = Object.fromEntries(
      head.data.fields.map((field, index) => [questions.data[index]?.key ?? '', field.target]),
    )
    await context.payload.update({
      collection: 'intakeForms',
      id: head.data.id,
      data: { formFields: questions.data, fieldMap: { ...current, ...targets } },
      req: context.req,
    })
    revalidatePath(INTAKE_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveIntakeFormFields', 'Unable to save the form questions.')
  }
}
