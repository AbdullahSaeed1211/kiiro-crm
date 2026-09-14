import { describe, expect, it } from 'vitest'
import { allTemplates, templateFor, TEMPLATE_KEYS } from '../src'

describe('vertical templates', () => {
  it('ships one validated preset for every onboarding option', () => {
    expect(allTemplates().map((template) => template.key)).toEqual([...TEMPLATE_KEYS])
    for (const template of allTemplates()) {
      expect(template.workflows.map((workflow) => workflow.recordType)).toEqual(
        expect.arrayContaining(['lead', 'deal', 'project', 'task']),
      )
      expect(template.views.length).toBeGreaterThan(0)
    }
  })

  it('marks sensitive vertical fields and returns undefined for unknown keys', () => {
    expect(templateFor('legal')?.sensitive).toBe(true)
    expect(templateFor('legal')?.fields.find((field) => field.key === 'caseType')?.sensitive).toBe(true)
    expect(templateFor('health')?.sensitive).toBe(true)
    expect(templateFor('does-not-exist')).toBeUndefined()
  })
})
