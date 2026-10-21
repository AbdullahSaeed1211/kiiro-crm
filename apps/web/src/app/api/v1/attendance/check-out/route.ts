import { checkOut } from '@ops/module-work'
import { attendanceDeps } from '@/server/attendance'
import { apiRoute } from '@/server/api/http'
import { contractBody } from '@/server/api/contracts'

export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'attendance.checkOut')
  return body.ok ? checkOut(attendanceDeps(context), body.value) : body
})
