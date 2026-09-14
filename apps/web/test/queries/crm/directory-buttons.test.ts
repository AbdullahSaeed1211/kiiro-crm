import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const DIRECTORY_SOURCE_FILES = [
  'apps/web/src/app/(app)/directory-view.tsx',
  'apps/web/src/app/(app)/directory-list-view.tsx',
  'apps/web/src/app/(app)/organization-record-view.tsx',
  'apps/web/src/app/(app)/contact-record-view.tsx',
]

function anchorButtonOpenings(source: string): string[] {
  return source.match(/<Button\b[^>]*render=\{\s*<a\b[^>]*>/g) ?? []
}

describe('directory anchor buttons', () => {
  it('declare non-native semantics for every anchor-rendered Button', () => {
    const openings = DIRECTORY_SOURCE_FILES.flatMap((file) => anchorButtonOpenings(readFileSync(resolve(file), 'utf8')))

    expect(openings).toHaveLength(3)
    expect(openings.every((opening) => opening.includes('nativeButton={false}'))).toBe(true)
  })
})
