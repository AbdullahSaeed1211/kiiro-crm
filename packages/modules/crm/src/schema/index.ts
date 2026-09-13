import { z } from 'zod'

const id = z.string().trim().min(1)
const optionalId = id.nullable().optional()
const optionalText = z.string().trim().max(10_000).nullable().optional()
const optionalEmail = z.string().trim().pipe(z.email()).nullable().optional()
const optionalNumber = z.number().nullable().optional()
const idList = z.array(id).default([])
const customData = z.record(z.string(), z.unknown()).optional()

export const moneySchema = z
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
    expectedUpdatedAt: z.number(),
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
    expectedUpdatedAt: z.number(),
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
    expectedUpdatedAt: z.number(),
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
    expectedCloseAt: optionalNumber,
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
    expectedUpdatedAt: z.number(),
    patch: z
      .object({
        title: z.string().trim().min(1).max(300).optional(),
        organizationId: optionalId,
        contactIds: z.array(id).optional(),
        primaryContactId: optionalId,
        value: moneySchema.nullable().optional(),
        expectedCloseAt: optionalNumber,
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
    expectedUpdatedAt: z.number(),
    reason: z.string().trim().max(5_000).optional(),
  })
  .strict()

export const moveDealSchema = z
  .object({
    dealId: id,
    toStageId: id,
    expectedUpdatedAt: z.number(),
    reason: z.string().trim().max(5_000).optional(),
  })
  .strict()

export const markLostSchema = z
  .object({
    id,
    expectedUpdatedAt: z.number(),
    lostReasonId: id,
    lostNote: z.string().trim().max(5_000).nullable().optional(),
  })
  .strict()

export const convertLeadSchema = z
  .object({
    leadId: id,
    expectedUpdatedAt: z.number(),
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

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type CreateDealInput = z.infer<typeof createDealSchema>
export type UpdateDealInput = z.infer<typeof updateDealSchema>
export type MoveLeadInput = z.infer<typeof moveLeadSchema>
export type MoveDealInput = z.infer<typeof moveDealSchema>
export type MarkLostInput = z.infer<typeof markLostSchema>
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>
