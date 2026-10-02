import { notFound } from 'next/navigation'
import { getProductContext, type ProductContext } from '../auth/context'

/** Operator access is an explicit allow-list, separate from tenant role checks. */
export async function requireOperator(): Promise<ProductContext> {
  const context = await getProductContext()
  // The generated environment types say this is always set, but a tenant that has no operators leaves it out.
  const configured: unknown = Reflect.get(process.env, 'OPERATOR_EMAILS')
  const allowed = (typeof configured === 'string' ? configured : '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  if (
    allowed.length === 0 ||
    typeof context.user.email !== 'string' ||
    !allowed.includes(context.user.email.toLowerCase())
  )
    notFound()
  return context
}
