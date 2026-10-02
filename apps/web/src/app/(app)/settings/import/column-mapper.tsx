'use client'

import { NativeSelect, NativeSelectOption } from '@ops/ui/components/ui/native-select'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { IMPORT_MAPPING_COPY } from '../../../../i18n/import-mapping-copy'
import type { ColumnChoice } from '../../../../server/crm/import-mapping'

export const KEEP = '__keep__'
export const SKIP = '__skip__'

/** The names to send with the file: the chosen column, the file's own header, or null to leave a column out. */
export function namesFor(choices: readonly ColumnChoice[], picks: readonly string[]): (string | null)[] {
  return choices.map((choice, index) => {
    const pick = picks[index] ?? KEEP
    if (pick === SKIP) return null
    return pick === KEEP ? choice.header : pick
  })
}

/** The first pick for each file column: our best guess, or the file's own name. */
export function firstPicks(choices: readonly ColumnChoice[]): string[] {
  return choices.map((choice) => choice.column ?? KEEP)
}

interface MapperProps {
  readonly choices: readonly ColumnChoice[]
  readonly picks: readonly string[]
  readonly allowed: readonly string[]
  readonly onChange: (index: number, pick: string) => void
}

/** One row per file column, so a file from another tool can be matched to our fields before the check. */
export function ColumnMapper({ choices, picks, allowed, onChange }: MapperProps) {
  const copy = catalogFor(IMPORT_MAPPING_COPY, useLocale())
  if (choices.length === 0) return null
  return (
    <fieldset className="grid gap-2 rounded-lg border p-4">
      <legend className="px-1 font-medium">{copy.title}</legend>
      <p className="text-muted-foreground">{copy.hint}</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
        <span className="text-xs font-medium text-muted-foreground">{copy.fileColumn}</span>
        <span className="hidden text-xs font-medium text-muted-foreground sm:block">{copy.meansColumn}</span>
        {choices.map((choice, index) => (
          <ColumnRow
            key={`${choice.header}:${String(index)}`}
            header={choice.header}
            pick={picks[index] ?? KEEP}
            allowed={allowed}
            onChange={(pick) => {
              onChange(index, pick)
            }}
          />
        ))}
      </div>
    </fieldset>
  )
}

function ColumnRow({
  header,
  pick,
  allowed,
  onChange,
}: Readonly<{ header: string; pick: string; allowed: readonly string[]; onChange: (pick: string) => void }>) {
  const copy = catalogFor(IMPORT_MAPPING_COPY, useLocale())
  return (
    <>
      <span className="truncate font-medium">{header === '' ? '—' : header}</span>
      <NativeSelect
        aria-label={`${copy.meansColumn}: ${header}`}
        value={pick}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        {allowed.map((column) => (
          <NativeSelectOption key={column} value={column}>
            {copy.columns[column] ?? column}
          </NativeSelectOption>
        ))}
        <NativeSelectOption value={KEEP}>{copy.keep}</NativeSelectOption>
        <NativeSelectOption value={SKIP}>{copy.skip}</NativeSelectOption>
      </NativeSelect>
    </>
  )
}
