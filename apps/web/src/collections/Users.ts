import type { CollectionConfig } from 'payload'

const isProduction = process.env.NODE_ENV === 'production'

/** Auth collection with the session and lockout settings of decision D-38; product fields arrive with the adapter collections. */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: {
    tokenExpiration: 604800,
    maxLoginAttempts: 5,
    lockTime: 600000,
    useAPIKey: false,
    // Secure cookies need HTTPS; local development runs on http://localhost.
    cookies: { secure: isProduction, sameSite: 'Lax' },
  },
  fields: [],
}
