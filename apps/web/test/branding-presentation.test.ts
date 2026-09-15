import { describe, expect, it } from 'vitest'
import { brandPresentation } from '../src/server/branding/presentation'

describe('tenant branding presentation', () => {
  it('uses the Mirch Media branded fallback when settings are empty', () => {
    expect(brandPresentation({})).toMatchObject({
      appName: 'Mirch Media',
      primaryHex: '#E45735',
      radius: 'md',
      logoUrl: null,
      faviconUrl: '/api/v1/brand/favicon',
    })
  })

  it('renders distinct tenant settings without hard-coded identity', () => {
    const northstar = brandPresentation({
      appName: 'Northstar',
      brand: { primaryHex: '#123456', radius: 'sm' },
      logoFileKey: 'brand/logo.svg',
      faviconFileKey: 'brand/favicon.ico',
    })
    const atlas = brandPresentation({
      appName: 'Atlas',
      brand: { primaryHex: '#abcdef', radius: 'lg' },
      logoFileKey: 'brand/logo.png',
      faviconFileKey: null,
    })
    expect(northstar).toMatchObject({
      appName: 'Northstar',
      primaryHex: '#123456',
      radius: 'sm',
      logoUrl: '/api/v1/brand/logo?v=brand%2Flogo.svg',
    })
    expect(atlas).toMatchObject({
      appName: 'Atlas',
      primaryHex: '#abcdef',
      radius: 'lg',
      logoUrl: '/api/v1/brand/logo?v=brand%2Flogo.png',
      faviconUrl: '/api/v1/brand/favicon',
    })
    expect(northstar.appName).not.toBe(atlas.appName)
    expect(northstar.primaryHex).not.toBe(atlas.primaryHex)
  })
})
