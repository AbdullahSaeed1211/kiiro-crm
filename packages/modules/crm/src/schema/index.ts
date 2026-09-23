import { z } from 'zod'

const id = z.string().trim().min(1)
const optionalId = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  id.nullable().optional(),
)
const optionalText = z.string().trim().max(10_000).nullable().optional()
const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().pipe(z.email()).nullable().optional(),
)
const epoch = z.number().nonnegative()
const optionalEpoch = epoch.nullable().optional()
const idList = z.array(id).default([])
const customData = z.record(z.string(), z.unknown()).optional()

const moneySchema = z
  .object({
    amountMinor: z.number().int(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase()),
  })
  .strict()

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(300),
    website: optionalText,
    phone: optionalText,
    email: optionalEmail,
    ownerId: optionalId,
    sourceId: optionalId,
    customData,
  })
  .strict()

export const updateOrganizationSchema = z
  .object({
    id,
    expectedUpdatedAt: epoch,
    patch: z
      .object({
        name: z.string().trim().min(1).max(300).optional(),
        website: optionalText,
        phone: optionalText,
        email: optionalEmail,
        ownerId: optionalId,
        sourceId: optionalId,
        customData,
      })
      .strict(),
  })
  .strict()

export const createContactSchema = z
  .object({
    firstName: z.string().trim().min(1).max(200),
    lastName: optionalText,
    email: optionalEmail,
    phone: optionalText,
    organizationId: optionalId,
    ownerId: optionalId,
    customData,
  })
  .strict()

export const updateContactSchema = z
  .object({
    id,
    expectedUpdatedAt: epoch,
    patch: z
      .object({
        firstName: z.string().trim().min(1).max(200).optional(),
        lastName: optionalText,
        email: optionalEmail,
        phone: optionalText,
        organizationId: optionalId,
        ownerId: optionalId,
        customData,
      })
      .strict(),
  })
  .strict()

const pipelineFields = {
  title: z.string().trim().min(1).max(300).optional(),
  firstName: optionalText,
  lastName: optionalText,
  email: optionalEmail,
  phone: optionalText,
  companyName: optionalText,
  organizationId: optionalId,
  sourceId: optionalId,
  ownerId: optionalId,
  assigneeIds: idList,
  workflowId: optionalId,
  stageId: optionalId,
  customData,
}

export const createLeadSchema = z.object(pipelineFields).strict()

export const updateLeadSchema = z
  .object({
    id,
    expectedUpdatedAt: epoch,
    patch: z
      .object({
        title: z.string().trim().min(1).max(300).optional(),
        firstName: optionalText,
        lastName: optionalText,
        email: optionalEmail,
        phone: optionalText,
        companyName: optionalText,
        organizationId: optionalId,
        sourceId: optionalId,
        ownerId: optionalId,
        assigneeIds: z.array(id).optional(),
        customData,
      })
      .strict(),
  })
  .strict()

export const createDealSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    organizationId: optionalId,
    contactIds: idList,
    primaryContactId: optionalId,
    value: moneySchema.nullable().optional(),
    expectedCloseAt: optionalEpoch,
    ownerId: optionalId,
    assigneeIds: idList,
    workflowId: optionalId,
    stageId: optionalId,
    sourceLeadId: optionalId,
    customData,
  })
  .strict()

export const updateDealSchema = z
  .object({
    id,
    expectedUpdatedAt: epoch,
    patch: z
      .object({
        title: z.string().trim().min(1).max(300).optional(),
        organizationId: optionalId,
        contactIds: z.array(id).optional(),
        primaryContactId: optionalId,
        value: moneySchema.nullable().optional(),
        expectedCloseAt: optionalEpoch,
        ownerId: optionalId,
        assigneeIds: z.array(id).optional(),
        sourceLeadId: optionalId,
        customData,
      })
      .strict(),
  })
  .strict()

export const moveLeadSchema = z
  .object({
    leadId: id,
    toStageId: id,
    expectedUpdatedAt: epoch,
    reason: z.string().trim().max(5_000).optional(),
  })
  .strict()

export const moveDealSchema = z
  .object({
    dealId: id,
    toStageId: id,
    expectedUpdatedAt: epoch,
    reason: z.string().trim().max(5_000).optional(),
  })
  .strict()

export const markLostSchema = z
  .object({
    id,
    expectedUpdatedAt: epoch,
    lostReasonId: id,
    lostNote: z.string().trim().max(5_000).nullable().optional(),
  })
  .strict()

export const convertLeadSchema = z
  .object({
    leadId: id,
    expectedUpdatedAt: epoch,
    organization: z
      .union([
        z.object({ existingId: id }).strict(),
        z.object({ create: z.object({ name: z.string().trim().min(1).max(300) }).strict() }).strict(),
      ])
      .nullable(),
    contact: z.union([z.object({ existingId: id }).strict(), z.object({ create: z.literal(true) }).strict()]),
    deal: z
      .object({
        title: z.string().trim().min(1).max(300).optional(),
        value: moneySchema.nullable().optional(),
        workflowId: id.optional(),
        customData: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
  })
  .strict()

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type UpdateDealInput = z.infer<typeof updateDealSchema>
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>
