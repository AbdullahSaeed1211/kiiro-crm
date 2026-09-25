import { describe, expect, it, vi } from 'vitest'
import { applyTemplate } from '../src/server/actions/onboarding/apply-template'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('onboarding template application', () => {
  it('upserts vertical workflows, fields, views, and applied-template metadata', async () => {
    const creates: string[] = []
    const updates: string[] = []
    const payload = {
      find: vi.fn((options: Record<string, unknown>) => {
        const collection = options.collection
        if (collection === 'workflows')
          return Promise.resolve({ docs: [{ id: 'lead-workflow', stages: [{ id: 'lead-stage-1', name: 'New' }] }] })
        return Promise.resolve({ docs: [] })
      }),
      create: vi.fn((options: Record<string, unknown>) => {
        creates.push(String(options.collection))
        return Promise.resolve({ id: 'created' })
      }),
      update: vi.fn((options: Record<string, unknown>) => {
        updates.push(String(options.collection))
        return Promise.resolve({ id: 'updated' })
      }),
      findGlobal: vi.fn(() => Promise.resolve({ terminology: {}, modules: {}, appliedTemplates: [] })),
      updateGlobal: vi.fn(() => Promise.resolve({})),
    }
    const result = await applyTemplate({ payload, req: {} as never }, 'legal')
    expect(result).toEqual({ ok: true, data: { key: 'legal' } })
    expect(updates).toContain('workflows')
    expect(creates).toContain('fieldDefinitions')
    expect(creates).toContain('savedViews')
  })

  it('rejects an unsupported preset before touching tenant data', async () => {
    const payload = { findGlobal: vi.fn(), updateGlobal: vi.fn() }
    const result = await applyTemplate({ payload, req: {} as never }, 'unknown')
    expect(result).toEqual({ ok: false, error: { code: 'VALIDATION', message: 'Choose a supported business type.' } })
    expect(payload.findGlobal).not.toHaveBeenCalled()
  })
})
