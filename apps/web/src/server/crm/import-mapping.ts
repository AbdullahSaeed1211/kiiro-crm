import { CORE_COLUMNS, formatCsv, parseCsv } from '@ops/module-crm'

export type ImportKind = keyof typeof CORE_COLUMNS

/** Other names that spreadsheets and other CRMs use for our columns, in lower case without spaces or marks. */
const ALIASES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    firstname: 'firstName',
    first: 'firstName',
    givenname: 'firstName',
    lastname: 'lastName',
    last: 'lastName',
    surname: 'lastName',
    familyname: 'lastName',
    email: 'email',
    emailaddress: 'email',
    mail: 'email',
    phone: 'phone',
    phonenumber: 'phone',
    mobile: 'phone',
    mobilephone: 'phone',
    telephone: 'phone',
    company: 'companyName',
    companyname: 'companyName',
    organization: 'organization',
    organisation: 'organization',
    account: 'organization',
    accountname: 'organization',
    website: 'website',
    url: 'website',
    name: 'name',
    title: 'title',
    dealname: 'title',
    leadname: 'title',
    source: 'source',
    leadsource: 'source',
    value: 'value',
    amount: 'value',
    dealamount: 'value',
    currency: 'currency',
    stage: 'stage',
    dealstage: 'stage',
    expectedclose: 'expectedClose',
    closedate: 'expectedClose',
    expectedclosedate: 'expectedClose',
  }),
)

const simple = (header: string): string => header.toLowerCase().replaceAll(/[^a-z0-9]/gu, '')

/** The best matching column for one file header, or undefined when none fits this record type. */
function guessColumn(kind: ImportKind, header: string): string | undefined {
  const allowed = CORE_COLUMNS[kind]
  const key = simple(header)
  const exact = allowed.find((column) => simple(column) === key)
  if (exact !== undefined) return exact
  const alias = ALIASES.get(key)
  return alias !== undefined && allowed.includes(alias) ? alias : undefined
}

export interface ColumnChoice {
  readonly header: string
  /** The column this header maps to, or undefined to keep the header as it is (custom fields use their own names). */
  readonly column: string | undefined
}

export interface ColumnSuggestion {
  readonly choices: readonly ColumnChoice[]
  /** Every column this record type can read. */
  readonly allowed: readonly string[]
}

/** The headers of a CSV file with a guessed column for each; no choices when the file cannot be read. */
export function suggestColumns(kind: ImportKind, csv: string): ColumnSuggestion {
  const allowed = CORE_COLUMNS[kind]
  try {
    const headers = parseCsv(csv)[0] ?? []
    return { allowed, choices: headers.map((header) => ({ header, column: guessColumn(kind, header) })) }
  } catch {
    return { allowed, choices: [] }
  }
}

/** Replaces the first row with the chosen names. A null entry gives the column a name that no import reads. */
export function applyMapping(csv: string, names: readonly (string | null)[]): string {
  const [header = [], ...rows] = parseCsv(csv)
  const renamed = header.map((original, index) => {
    const name = names.at(index)
    if (name === undefined) return original
    if (name === null) return `__skip_${String(index)}`
    return name
  })
  return formatCsv([renamed, ...rows])
}
