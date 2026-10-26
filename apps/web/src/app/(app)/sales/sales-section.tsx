import type { ReactNode } from 'react'

export function SalesSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}
