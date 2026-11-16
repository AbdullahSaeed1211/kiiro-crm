import { formFieldsSchema } from '@ops/module-intake'
import type { ProductContext } from '../../auth/context'

/** Safe launcher data for active hosted lead forms; routing, secrets and submission history stay server-side. */
export async function listActiveHostedIntakeForms(context: ProductContext) {
  const found = await context.payload.find({
    collection: 'intakeForms',
    where: { active: { equals: true } },
    sort: 'name',
    pagination: false,
    depth: 0,
    select: { id: true, name: true, key: true, formFields: true },
    overrideAccess: true,
    req: context.req,
  })
  return found.docs.flatMap((form) => {
    const parsed = formFieldsSchema.safeParse(form.formFields ?? [])
    return parsed.success && parsed.data.length > 0 ? [{ id: form.id, name: form.name, key: form.key }] : []
  })
}
