'use server'

import { listCrmPage } from '@ops/adapter-payload'
import { z } from 'zod'
import { getRequestContext } from '../container'
import { searchWhere } from './directory/query'

const PICKER_SIZE = 100

const searchSchema = z.object({ type: z.enum(['organization', 'contact']), query: z.string().max(80) }).strict()

export interface PickerOptions {
  readonly options: readonly { readonly id: string; readonly name: string }[]
  /** True when more records match than are listed, so the person should narrow the search. */
  readonly more: boolean
}

/** The first records of a kind whose name matches the text, for a pick list that stays short however big the book is. */
export async function searchRecordOptions(input: unknown): Promise<PickerOptions> {
  const parsed = searchSchema.safeParse(input)
  if (!parsed.success) return { options: [], more: false }
  const { type, query } = parsed.data
  const context = await getRequestContext()
  if (type === 'organization') {
    const found = await listCrmPage(context.req, {
      type,
      where: searchWhere(query, ['name']),
      sort: ['name', 'id'],
      page: 1,
      limit: PICKER_SIZE,
    })
    return { options: found.records.map(({ id, name }) => ({ id, name })), more: found.total > PICKER_SIZE }
  }
  const found = await listCrmPage(context.req, {
    type,
    where: searchWhere(query, ['firstName', 'lastName', 'email']),
    sort: ['firstName', 'lastName', 'id'],
    page: 1,
    limit: PICKER_SIZE,
  })
  return {
    options: found.records.map((contact) => ({
      id: contact.id,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
    })),
    more: found.total > PICKER_SIZE,
  }
}
