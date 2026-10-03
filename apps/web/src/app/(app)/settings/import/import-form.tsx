'use client'

import { Button } from '@ops/ui/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@ops/ui/components/ui/native-select'
import type { ImportReport } from '@ops/module-crm'
import { useEffect, useState, useTransition } from 'react'
import { importCsvAction, suggestColumnsAction } from '../../../../server/crm/import'
import type { ColumnChoice } from '../../../../server/crm/import-mapping'
import { ColumnMapper, firstPicks, namesFor } from './column-mapper'
import { describeClientError } from '../../client-errors'

const TYPES = [
  ['organization', 'Organizations'],
  ['contact', 'Contacts'],
  ['lead', 'Leads'],
  ['deal', 'Deals'],
] as const
type ImportType = (typeof TYPES)[number][0]

const MAX_BYTES = 5_000_000
const SHOWN_ERRORS = 50

interface Outcome {
  readonly dryRun: boolean
  readonly report: ImportReport
}

function summary({ dryRun, report }: Outcome): string {
  const lead = dryRun ? 'Check complete, nothing was imported yet.' : 'Import complete.'
  const created = dryRun ? 'can be created' : 'created'
  const parts = [
    `${lead} ${String(report.total)} rows read: ${String(report.created)} ${created}`,
    `${String(report.skipped)} skipped as already existing`,
    `${String(report.errors.length)} with problems.`,
  ]
  const added = report.organizationsCreated
  const verb = dryRun ? 'would be' : 'were'
  const organizations = added > 0 ? ` ${String(added)} new organizations ${verb} added.` : ''
  return `${parts.join(', ')}${organizations}`
}

function Report({ outcome }: Readonly<{ outcome: Outcome }>) {
  const { report } = outcome
  return (
    <div className="grid gap-2 rounded-lg border p-4 text-sm" role="status">
      <p className="font-medium">{summary(outcome)}</p>
      {outcome.dryRun && report.errors.length > 0 ? (
        <p className="text-muted-foreground">
          Rows with problems are skipped when you import. Fix the file and check it again to include them.
        </p>
      ) : null}
      {report.ignoredColumns.length > 0 ? (
        <p className="text-muted-foreground">
          Columns not recognised and left out: {report.ignoredColumns.join(', ')}.
        </p>
      ) : null}
      {report.errors.length > 0 ? (
        <ul className="grid gap-1">
          {report.errors.slice(0, SHOWN_ERRORS).map((error) => (
            <li key={error.row}>
              <span className="font-medium">Row {error.row}:</span> {error.message}
            </li>
          ))}
          {report.errors.length > SHOWN_ERRORS ? <li>…and {report.errors.length - SHOWN_ERRORS} more.</li> : null}
        </ul>
      ) : null}
    </div>
  )
}

/** The chosen file's text and name, read in the browser; files over the limit are refused with a message. */
function useCsvFile() {
  const [csv, setCsv] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const choose = async (file: File | undefined) => {
    const tooBig = file !== undefined && file.size > MAX_BYTES
    setProblem(tooBig ? 'The file is larger than 5 MB.' : null)
    if (file === undefined || tooBig) {
      setCsv(null)
      return
    }
    setFileName(file.name)
    setCsv(await file.text())
  }
  return { csv, fileName, problem, choose }
}

/** Runs the check or the import and keeps the latest report or error. */
function useImportRun(input: {
  readonly type: ImportType
  readonly csv: string | null
  readonly names: (string | null)[] | undefined
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const run = (dryRun: boolean) => {
    if (input.csv === null) return
    const { type, csv, names } = input
    setError(null)
    startTransition(async () => {
      try {
        const result = await importCsvAction({ type, csv, dryRun, ...(names === undefined ? {} : { names }) })
        if (result.ok) setOutcome({ dryRun, report: result.data })
        else setError(result.error.message)
      } catch (caught) {
        setError(describeClientError(caught, { context: 'csv import', fallback: 'Unable to import. Try again.' }))
      }
    })
  }
  const reset = () => {
    setOutcome(null)
  }
  return { outcome, error, pending, run, reset }
}

/** The file's columns with our guess for each, and the person's changes to those guesses. */
function useColumnPicks(type: ImportType, csv: string | null) {
  const [choices, setChoices] = useState<readonly ColumnChoice[]>([])
  const [allowed, setAllowed] = useState<readonly string[]>([])
  const [picks, setPicks] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let current = true
    setReady(false)
    if (csv === null) {
      setChoices([])
      return
    }
    void suggestColumnsAction({ type, csv }).then((found) => {
      if (!current) return
      setChoices(found.choices)
      setAllowed(found.allowed)
      setPicks(firstPicks(found.choices))
      setReady(true)
    })
    return () => {
      current = false
    }
  }, [type, csv])
  const change = (index: number, pick: string) => {
    setPicks((before) => before.map((value, at) => (at === index ? pick : value)))
  }
  return { ready, choices, allowed, picks, change, names: choices.length === 0 ? undefined : namesFor(choices, picks) }
}

/** The check waits for the column match to load, so a file is never checked before its columns are matched. */
function isReadyToCheck(state: Readonly<{ hasFile: boolean; mappingReady: boolean; pending: boolean }>): boolean {
  return state.hasFile && state.mappingReady && !state.pending
}

/** Pick a record type and a CSV file, check it, then import it; every row is reported. */
export function ImportForm() {
  const [type, setType] = useState<ImportType>('contact')
  const file = useCsvFile()
  const mapping = useColumnPicks(type, file.csv)
  const job = useImportRun({ type, csv: file.csv, names: mapping.names })
  const problem = job.error ?? file.problem
  const canCheck = isReadyToCheck({ hasFile: file.csv !== null, mappingReady: mapping.ready, pending: job.pending })
  const canImport = canCheck && job.outcome?.dryRun === true
  return (
    <div className="grid gap-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          <span className="font-medium">Import</span>
          <NativeSelect
            value={type}
            onChange={(event) => {
              setType(TYPES.find(([value]) => value === event.target.value)?.[0] ?? 'contact')
              job.reset()
            }}
          >
            {TYPES.map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1">
          <span className="font-medium">CSV file</span>
          <input
            accept=".csv,text/csv"
            type="file"
            onChange={(event) => {
              job.reset()
              void file.choose(event.target.files?.[0])
            }}
          />
        </label>
      </div>
      <ColumnMapper
        choices={mapping.choices}
        picks={mapping.picks}
        allowed={mapping.allowed}
        onChange={(index, pick) => {
          job.reset()
          mapping.change(index, pick)
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!canCheck}
          onClick={() => {
            job.run(true)
          }}
        >
          Check file
        </Button>
        <Button
          size="sm"
          disabled={!canImport}
          onClick={() => {
            job.run(false)
          }}
        >
          Import
        </Button>
        {file.csv === null ? null : <span className="text-muted-foreground">{file.fileName}</span>}
      </div>
      {problem === null ? null : (
        <p role="alert" className="text-destructive">
          {problem}
        </p>
      )}
      {job.outcome === null ? null : <Report outcome={job.outcome} />}
    </div>
  )
}
