import type { ReactNode } from 'react'

/** Padded page body below the header (spec §15.3). */
export function PageContent({ children }: Readonly<{ children: ReactNode }>) {
  // SidebarInset already renders the <main> landmark, so this is a plain div.
  return <div className="ops-page-content flex flex-1 flex-col gap-4 px-4 py-3 md:px-6 md:py-4">{children}</div>
}
