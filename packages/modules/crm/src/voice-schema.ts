import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { z } from 'zod'

function usPhone(value: string): string | undefined {
  const parsed = parsePhoneNumberFromString(value, 'US')
  return parsed?.country === 'US' && parsed.isValid() ? parsed.number : undefined
}

export const voiceSessionSchema = z.object({ deviceId: z.string().trim().min(8).max(128) }).strict()

export const voiceDialSchema = z
  .object({
    numberId: z.string().min(1).max(128),
    to: z.string().trim().min(1).max(40).transform(usPhone).pipe(z.string().min(1, 'Enter a valid US phone number.')),
    leadId: z.string().min(1).max(128).optional(),
    requestKey: z.string().trim().min(8).max(128),
    deviceId: z.string().trim().min(8).max(128),
  })
  .strict()

export const voiceNumberSearchSchema = z.object({ areaCode: z.string().regex(/^[2-9]\d{2}$/u) }).strict()

export const voiceNumberPurchaseSchema = z
  .object({
    offerToken: z.string().min(16).max(2048),
    requestKey: z.string().trim().min(8).max(128),
  })
  .strict()

export const voiceNumberUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    assigneeIds: z.array(z.string().min(1).max(128)).max(100),
    inboundEnabled: z.boolean(),
    outboundEnabled: z.boolean(),
    recordingEnabled: z.boolean(),
  })
  .strict()

export const voiceNumberReleaseSchema = z.object({ requestKey: z.string().trim().min(8).max(128) }).strict()

const wrapupSchema = z
  .object({
    action: z.literal('wrapup'),
    outcome: z.enum([
      'interested',
      'booking_arranged',
      'call_back_later',
      'no_answer',
      'voicemail',
      'not_interested',
      'wrong_number',
    ]),
    notes: z.string().trim().max(4000).optional(),
    nextActionAt: z.number().int().positive().nullable().optional(),
    appointmentAt: z.number().int().positive().nullable().optional(),
  })
  .strict()

export const voiceCallActionSchema = z
  .discriminatedUnion('action', [
    z.object({ action: z.literal('answer'), deviceId: z.string().trim().min(8).max(128) }).strict(),
    z.object({ action: z.literal('decline'), deviceId: z.string().trim().min(8).max(128) }).strict(),
    z.object({ action: z.literal('hangup'), deviceId: z.string().trim().min(8).max(128) }).strict(),
    wrapupSchema,
  ])
  .superRefine((value, context) => {
    if (value.action !== 'wrapup') return
    if (value.outcome === 'call_back_later' && typeof value.nextActionAt !== 'number') {
      context.addIssue({ code: 'custom', path: ['nextActionAt'], message: 'Choose a callback date and time.' })
    }
    if (value.outcome === 'booking_arranged' && typeof value.appointmentAt !== 'number') {
      context.addIssue({ code: 'custom', path: ['appointmentAt'], message: 'Choose an appointment date and time.' })
    }
  })

export const voiceSettingsSchema = z
  .object({
    enabled: z.boolean(),
    recordingEnabled: z.boolean(),
    maxCallSeconds: z.number().int().min(30).max(14400),
    maxConcurrentCalls: z.number().int().min(1).max(50),
    ringSeconds: z.number().int().min(10).max(120),
    fallback: z.enum(['voicemail', 'forward']),
    forwardingNumber: z
      .string()
      .nullable()
      .transform((value, context) => {
        if (value === null || value.trim() === '') return null
        const normalized = usPhone(value)
        if (normalized === undefined) {
          context.addIssue({ code: 'custom', message: 'Enter a valid US forwarding number.' })
          return z.NEVER
        }
        return normalized
      }),
  })
  .strict()
  .refine((value) => value.fallback !== 'forward' || value.forwardingNumber !== null, {
    path: ['forwardingNumber'],
    message: 'Enter a forwarding number when forwarding is enabled.',
  })
