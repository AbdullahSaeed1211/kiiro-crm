import type { ApiContract } from './contract-types'

/** The CSV downloads for time and for the change log. Owners and managers only. */
export const EXPORT_CONTRACTS = {
  'export.time': {
    method: 'GET',
    path: '/api/v1/export/time',
    summary: 'Download logged time as CSV. Owners and managers only.',
    query: [
      { name: 'from', description: 'First day, YYYY-MM-DD.' },
      { name: 'to', description: 'Last day, YYYY-MM-DD.' },
    ],
    returns: 'csv',
    success: 200,
  },
  'export.activity': {
    method: 'GET',
    path: '/api/v1/export/activity',
    summary: 'Download the change log as CSV, newest first, up to 5000 rows. Owners and managers only.',
    query: [
      { name: 'log', description: 'Use security for the security and settings log instead of record changes.' },
      { name: 'actor', description: 'Only changes by this person (user id).' },
      { name: 'type', description: 'Only this record type, such as lead or deal.' },
      { name: 'event', description: 'Only this kind of change, such as stage.changed.' },
      { name: 'from', description: 'First day, YYYY-MM-DD, in UTC.' },
      { name: 'to', description: 'Last day, YYYY-MM-DD, in UTC.' },
    ],
    returns: 'csv',
    success: 200,
  },
} satisfies Record<string, ApiContract>
