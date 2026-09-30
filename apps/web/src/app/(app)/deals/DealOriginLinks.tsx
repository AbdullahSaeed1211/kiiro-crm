import Link from 'next/link'

/** Shows where a deal came from and the onboarding project it started, so the lead-to-client path is one click each way. */
export function DealOriginLinks({
  sourceLeadId,
  projectId,
}: Readonly<{ sourceLeadId: string | null; projectId: string | null }>) {
  if (sourceLeadId === null && projectId === null) return null
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {sourceLeadId === null ? null : (
        <span>
          From lead:{' '}
          <Link href={`/leads/${sourceLeadId}`} className="text-foreground underline underline-offset-2">
            open lead
          </Link>
        </span>
      )}
      {projectId === null ? null : (
        <span>
          Onboarding project:{' '}
          <Link href={`/projects/${projectId}`} className="text-foreground underline underline-offset-2">
            open project
          </Link>
        </span>
      )}
    </p>
  )
}
