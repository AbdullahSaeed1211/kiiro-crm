import { z } from 'zod'

const role = z.enum(['owner', 'manager', 'staff'])
const text = z.string().trim().min(1)

/** Input of `inviteMember`. */
export const inviteMemberSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), role })

/** Input of the commands that act on one invitation or group. */
export const recordIdSchema = z.object({ id: text })

/** Input of `saveMember`; form posts send booleans as strings and an empty `reportsTo` for none. */
export const saveMemberSchema = z.object({
  id: text,
  role,
  active: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((value) => value === true || value === 'true'),
  groups: z.array(z.string()).default([]),
  reportsTo: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === undefined || value === null || value.trim() === '' ? null : value.trim())),
})

/** Input of `saveGroup`; an id updates, no id creates. */
export const saveGroupSchema = z.object({ id: z.string().optional(), name: text })
