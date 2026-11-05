import { openPortal, type PortalView } from '@ops/module-billing'
import { cache } from 'react'
import { normalizeLocale, type Locale } from '../../i18n/config'
import { payloadForAuth } from '../auth/api'
import { brandPresentation, type BrandPresentation } from '../branding/presentation'
import { tenantBrandDefaults } from '../branding/tenant-defaults'
import { portalPublicDeps } from './portal-deps'

export interface PortalWorkspace {
  readonly brand: BrandPresentation
  readonly locale: Locale
  readonly settings: Record<string, unknown>
}

/** The tenant's name, brand and language for portal pages, which have no session. Read once per request. */
export const loadPortalWorkspace = cache(async (): Promise<PortalWorkspace> => {
  const payload = await payloadForAuth()
  const settings: Record<string, unknown> = {
    ...(await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })),
  }
  return {
    brand: brandPresentation({ ...settings, ...tenantBrandDefaults() }),
    locale: normalizeLocale(settings.locale),
    settings,
  }
})

/** What one portal link shows, or `undefined` for a wrong, expired or revoked link. Read once per request. */
export const loadPortalView = cache(async (token: string): Promise<PortalView | undefined> => {
  const result = await openPortal(await portalPublicDeps(), token)
  return result.ok ? result.value : undefined
})
