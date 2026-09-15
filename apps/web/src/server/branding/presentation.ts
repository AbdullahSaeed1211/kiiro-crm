export interface BrandSettingsInput {
  readonly appName?: unknown
  readonly logoFileKey?: unknown
  readonly faviconFileKey?: unknown
  readonly brand?: unknown
  readonly fallbackAppName?: string
  readonly fallbackPrimaryHex?: string
}

export interface BrandPresentation {
  readonly appName: string
  readonly primaryHex: string
  readonly radius: 'sm' | 'md' | 'lg'
  readonly logoUrl: string | null
  readonly faviconUrl: string
}

/** Converts tenant-owned settings into the presentation values used by the shell. */
// eslint-disable-next-line complexity -- this pure normalizer intentionally handles each optional tenant setting.
export function brandPresentation(settings: BrandSettingsInput): BrandPresentation {
  const brand =
    typeof settings.brand === 'object' && settings.brand !== null ? (settings.brand as Record<string, unknown>) : {}
  const appName =
    typeof settings.appName === 'string' && settings.appName.trim() !== ''
      ? settings.appName
      : (settings.fallbackAppName ?? 'Workspace')
  const primaryHex =
    typeof brand.primaryHex === 'string' && /^#[\da-f]{6}$/i.test(brand.primaryHex)
      ? brand.primaryHex
      : (settings.fallbackPrimaryHex ?? '#64748b')
  const radius = brand.radius === 'sm' || brand.radius === 'lg' ? brand.radius : 'md'
  const key = (value: unknown) => (typeof value === 'string' && value.startsWith('brand/') ? value : null)
  const logoKey = key(settings.logoFileKey)
  const faviconKey = key(settings.faviconFileKey)
  return {
    appName,
    primaryHex,
    radius,
    logoUrl: logoKey ? `/api/v1/brand/logo?v=${encodeURIComponent(logoKey)}` : null,
    faviconUrl: faviconKey ? `/api/v1/brand/favicon?v=${encodeURIComponent(faviconKey)}` : '/api/v1/brand/favicon',
  }
}
