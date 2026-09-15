import { readFileSync } from 'node:fs'

interface SurfaceFixture {
  readonly loginPath: string
  readonly protectedRedirect: string
  readonly customerLinks: readonly string[]
}

const mode = process.argv[2]
if (mode !== 'repro' && mode !== 'fixed') throw new Error('expected repro or fixed')
const fixture = JSON.parse(readFileSync('surface.json', 'utf8')) as SurfaceFixture
const valid =
  fixture.loginPath === '/login' &&
  fixture.protectedRedirect === '/login' &&
  !fixture.customerLinks.some((href) => href.startsWith('/admin'))
if (!valid) {
  console.error('customer auth surface still exposes the administrative login boundary')
  process.exit(1)
}
console.log('customer auth surface uses /login and excludes administrative links')
