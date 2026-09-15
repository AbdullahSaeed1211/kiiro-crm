import type { ReactNode } from 'react'
import { requireOperator } from '../../server/operator/auth'

export const dynamic = 'force-dynamic'

export default async function OperatorLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireOperator()
  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
