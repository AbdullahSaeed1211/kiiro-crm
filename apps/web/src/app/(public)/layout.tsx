import '@ops/ui/globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/** A bare page shell for public pages such as hosted forms, which are meant to sit inside a customer's website. */
export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="font-sans antialiased">
      <body>
        <main className="mx-auto w-full max-w-lg p-4">{children}</main>
      </body>
    </html>
  )
}
