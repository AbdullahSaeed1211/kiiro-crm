import { checkIn, listAttendance } from '@ops/module-work'
import { attendanceDeps } from '@/server/attendance'
import { apiRoute } from '@/server/api/http'
import { contractBody } from '@/server/api/contracts'

export const dynamic = 'force-dynamic'
export const GET = apiRoute(async ({ request, context }) =>
  listAttendance(attendanceDeps(context), new URL(request.url).searchParams.get('view') === 'team'),
)
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'attendance.checkIn')
  return body.ok ? checkIn(attendanceDeps(context), body.value) : body
}, 201)
