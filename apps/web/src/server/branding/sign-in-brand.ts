import config from '@payload-config'
import { getPayload } from 'payload'
import { brandPresentation } from './presentation'
import { tenantBrandDefaults } from './tenant-defaults'

/** Tenant branding for the signed-out pages, read without a session. */
export async function loadSignInBrand(): Promise<ReturnType<typeof brandPresentation>> {
  const payload = await getPayload({ config })
  const settings = (await payload.findGlobal({ slug: 'settings', depth: 0 })) as unknown as Record<string, unknown>
  return brandPresentation({ ...settings, ...tenantBrandDefaults() })
}
