import { describe, expect, it } from 'vitest'
import { accessibleBrandColors } from '../../src/server/branding/accessible-colors'

function contrastRatio(firstHex: string, secondHex: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
  }
  const values = [luminance(firstHex), luminance(secondHex)].sort((a, b) => b - a)
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05)
}

describe('accessibleBrandColors', () => {
  it.each(['#e45735', '#2456a6', '#f2d746'])('derives accessible colors for %s', (primary) => {
    const colors = accessibleBrandColors(primary)

    expect(contrastRatio(primary, colors.foreground)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.textOnLight, '#f9f8f6')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.textOnLight, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.textOnDark, '#171717')).toBeGreaterThanOrEqual(4.5)
  })
})
