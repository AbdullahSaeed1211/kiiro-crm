'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import type { BillingCopy } from '../../../i18n/billing-copy'
import { EMPTY_LINE, type LineDraft } from './line-model'

type Field = keyof LineDraft

const COLUMNS: readonly (readonly [Field, 'itemDescription' | 'quantity' | 'unitPrice' | 'taxPercent', string])[] = [
  ['description', 'itemDescription', 'min-w-0 flex-[3_1_12rem]'],
  ['quantity', 'quantity', 'w-20'],
  ['price', 'unitPrice', 'w-28'],
  ['tax', 'taxPercent', 'w-20'],
]

/** The items of a quote or invoice: a row of inputs per item, with add and remove. */
export function LinesEditor({
  copy,
  lines,
  onChange,
}: Readonly<{ copy: BillingCopy; lines: readonly LineDraft[]; onChange: (next: readonly LineDraft[]) => void }>) {
  const edit = ({ index, field, value }: Readonly<{ index: number; field: Field; value: string }>) => {
    onChange(lines.map((line, at) => (at === index ? { ...line, [field]: value } : line)))
  }
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">{copy.lines}</legend>
      {lines.map((line, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          {COLUMNS.map(([field, label, width]) => (
            <label key={field} className={`grid gap-1 text-xs ${width}`}>
              <span>{copy[label]}</span>
              <Input
                value={line[field]}
                inputMode={field === 'description' ? 'text' : 'decimal'}
                onChange={(event) => {
                  edit({ index, field, value: event.target.value })
                }}
              />
            </label>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={lines.length === 1}
            onClick={() => {
              onChange(lines.filter((_, at) => at !== index))
            }}
          >
            {copy.removeLine}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => {
          onChange([...lines, EMPTY_LINE])
        }}
      >
        {copy.addLine}
      </Button>
    </fieldset>
  )
}
