import config from '@payload-config'
import { getPayload } from 'payload'
import { buildIcs } from '../../../../calendar/ics'
import { feedEvents, userForCalendarToken } from '../../../../calendar/feed'

/**
 * `GET /api/v1/calendar/<secret>.ics`: the private calendar feed of the person the secret belongs to, for calendar apps to
 * subscribe to. The secret in the address is the credential, so an unknown one answers 404 and nothing is cached.
 */
export async function GET(request: Request, route: { params: Promise<{ token: string }> }): Promise<Response> {
  const token = (await route.params).token.replace(/\.ics$/u, '')
  const payload = await getPayload({ config })
  const user = await userForCalendarToken(payload, token)
  if (user === null) return new Response('Not found', { status: 404 })
  const origin = new URL(request.url).origin
  const events = await feedEvents(payload, { user, origin })
  const body = buildIcs({ name: `${user.name} - tasks and follow-ups`, events, now: new Date() })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline; filename="calendar.ics"',
    },
  })
}
