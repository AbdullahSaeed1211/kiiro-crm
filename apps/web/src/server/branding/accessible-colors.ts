type Rgb = readonly [number, number, number]

const MINIMUM_CONTRAST = 4.5
const WHITE: Rgb = [255, 255, 255]
const LIGHT_SURFACE: Rgb = [249, 248, 246]
const NEAR_BLACK: Rgb = [23, 23, 23]

export interface AccessibleBrandColors {
  readonly foreground: string
  readonly textOnLight: string
  readonly textOnDark: string
}

function rgb(hex: string): Rgb {
  const value = hex.slice(1)
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as unknown as Rgb
}

function hex(channels: Rgb): string {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

function luminance(channels: Rgb): number {
  const linear = channels.map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
}

function contrast(first: Rgb, second: Rgb): number {
  const firstLuminance = luminance(first)
  const secondLuminance = luminance(second)
  const light = Math.max(firstLuminance, secondLuminance)
  const dark = Math.min(firstLuminance, secondLuminance)
  return (light + 0.05) / (dark + 0.05)
}

function blend(source: Rgb, target: Rgb, amount: number): Rgb {
  return source.map((channel, index) => channel * (1 - amount) + (target[index] ?? 0) * amount) as unknown as Rgb
}

function readableText(color: Rgb, background: Rgb, adjustment: Rgb): string {
  for (let amount = 0; amount <= 1; amount += 0.01) {
    const candidate = blend(color, adjustment, amount)
    const candidateHex = hex(candidate)
    if (contrast(rgb(candidateHex), background) >= MINIMUM_CONTRAST + 0.1) return candidateHex
  }
  return hex(adjustment)
}

/** Derives accessible foreground and link colors from a six-digit workspace brand color. */
export function accessibleBrandColors(primaryHex: string): AccessibleBrandColors {
  const primary = rgb(primaryHex)
  const foreground = contrast(primary, NEAR_BLACK) >= contrast(primary, WHITE) ? hex(NEAR_BLACK) : hex(WHITE)
  return {
    foreground,
    textOnLight: readableText(primary, LIGHT_SURFACE, NEAR_BLACK),
    textOnDark: readableText(primary, NEAR_BLACK, WHITE),
  }
}
