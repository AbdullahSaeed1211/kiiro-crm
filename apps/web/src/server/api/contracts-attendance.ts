import { attendancePunchSchema, attendanceCheckoutSchema } from '@ops/module-work'

export const ATTENDANCE_CONTRACTS = {
  'attendance.list': {
    method: 'GET',
    path: '/api/v1/attendance',
    summary: 'Recent own attendance, or admin team view with ?view=team. Unix UTC milliseconds.',
    success: 200,
  },
  'attendance.checkIn': {
    method: 'POST',
    path: '/api/v1/attendance',
    summary: 'Self check-in; server derives user and submittedAt.',
    body: attendancePunchSchema,
    success: 201,
  },
  'attendance.checkOut': {
    method: 'POST',
    path: '/api/v1/attendance/check-out',
    summary: 'Self check-out without changing original receipt times.',
    body: attendanceCheckoutSchema,
    success: 200,
  },
} as const
