import { describe, expect, it } from 'vitest'
import { formValues, validateRequired, type RecordFieldConfig } from '../../../src/composites/RecordForm/form'

const fields: RecordFieldConfig[] = [
  { name: 'title', label: 'Title', required: true },
  { name: 'note', label: 'Note' },
]

describe('record form helpers', () => {
  it('maps configured fields to stable editable values', () => {
    expect(formValues(fields, { title: 'Draft' })).toEqual({ title: 'Draft', note: '' })
  })

  it('only reports configured required fields', () => {
    expect(validateRequired(fields, { title: '  ', note: '' }, 'Required')).toEqual({ title: 'Required' })
    expect(validateRequired(fields, { title: 'Draft' }, 'Required')).toEqual({})
  })
})
