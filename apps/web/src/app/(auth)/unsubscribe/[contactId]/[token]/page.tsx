import type { Metadata } from 'next'
import { unsubscribeContact } from '../../../../../server/actions/unsubscribe'

export const metadata: Metadata = { title: 'Unsubscribe' }
export const dynamic = 'force-dynamic'

/** The page an unsubscribe link opens. The change happens on the button, so mail scanners that open links do not unsubscribe anyone. */
export default async function UnsubscribePage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ contactId: string; token: string }>; searchParams: Promise<{ done?: string }> }>) {
  const { contactId, token } = await params
  const { done } = await searchParams
  if (done === 'invalid') return <p>This unsubscribe link is not valid. Use the link in the latest email.</p>
  return done === '1' ? (
    <p>You are unsubscribed and will not get more newsletters.</p>
  ) : (
    <form action={unsubscribeContact} className="grid gap-3">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="token" value={token} />
      <p>Stop receiving our newsletter?</p>
      <button
        type="submit"
        className="h-10 w-fit rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Unsubscribe
      </button>
    </form>
  )
}
