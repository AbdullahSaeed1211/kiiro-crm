import Link from 'next/link'

export function SalesActions({
  model,
  copy,
}: Readonly<{
  model: Readonly<{ manager: boolean; team: boolean }>
  copy: { calendar: string; mine: string; team: string }
}>) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        className="rounded-md border px-3 py-2 hover:bg-muted"
        href={model.team ? '/calendar?view=team' : '/calendar'}
      >
        {copy.calendar}
      </Link>
      {model.manager ? (
        <>
          <Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/sales">
            {copy.mine}
          </Link>
          <Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/sales?view=team">
            {copy.team}
          </Link>
        </>
      ) : null}
    </div>
  )
}
