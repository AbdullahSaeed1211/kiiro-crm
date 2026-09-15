import { notFound } from 'next/navigation'
import { getProductContext, type ProductContext } from '../auth/context'

/** Operator access is an explicit allow-list, separate from tenant role checks. */
export async function requireOperator(): Promise<ProductContext> {
  const context = await getProductContext()
  const allowed = (process.env.OPERATOR_EMAILS ?? '')
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
