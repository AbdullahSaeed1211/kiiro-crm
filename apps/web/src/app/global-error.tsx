'use client'

/** Last-resort boundary when the root itself fails: a plain page with a reload button instead of a blank screen. */
export default function GlobalError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          margin: 0,
        }}
      >
        <main style={{ textAlign: 'center', maxWidth: '24rem', padding: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem' }}>Something went wrong</h1>
          <p style={{ color: '#666' }}>The page could not be shown. Reloading usually fixes it.</p>
          <button type="button" onClick={reset} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
