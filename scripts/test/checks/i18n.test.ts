import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalogFindings, literalInventory } from '../../check-i18n'
import { catalogFor } from '../../../apps/web/src/i18n/locale'
import { SHELL_COPY } from '../../../apps/web/src/i18n/config'

describe('check:i18n', () => {
  it('keeps every shipped locale catalog in key parity', () => {
    expect(catalogFindings()).toEqual([])
  })

  it('falls back to English for a future locale value', () => {
    expect(catalogFor(SHELL_COPY, 'fr').dashboard).toBe(SHELL_COPY.en.dashboard)
  })

  it('inventories user-facing JSX literals', () => {
    const inventory = literalInventory(join(process.cwd(), 'scripts/fixtures/checks/i18n'))
    expect(inventory).toEqual(['apps/web/src/app/example.tsx:2 Hello world'])
  })
})
