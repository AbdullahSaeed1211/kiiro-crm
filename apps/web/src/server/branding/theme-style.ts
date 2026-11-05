import type { CSSProperties } from 'react'
import { accessibleBrandColors } from './accessible-colors'

function primaryThemeStyle(value: unknown): Record<string, string> {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) return {}
  const colors = accessibleBrandColors(value)
  return {
    '--primary': value,
    '--ring': value,
    '--primary-foreground': colors.foreground,
    '--primary-text-light': colors.textOnLight,
    '--primary-text-dark': colors.textOnDark,
  }
}

/** The tenant's brand colour and corner radius as CSS variables, for any root layout. */
export function themeStyle(settings: Record<string, unknown>): CSSProperties {
  const brand =
    typeof settings.brand === 'object' && settings.brand !== null ? (settings.brand as Record<string, unknown>) : {}
  const radiusValue = brand.radius
  let radius: string | undefined
  if (radiusValue === 'sm') radius = '0.45rem'
  else if (radiusValue === 'lg') radius = '0.95rem'
  return {
    ...primaryThemeStyle(brand.primaryHex),
    ...(radius === undefined ? {} : { '--radius': radius }),
  } as CSSProperties
}
