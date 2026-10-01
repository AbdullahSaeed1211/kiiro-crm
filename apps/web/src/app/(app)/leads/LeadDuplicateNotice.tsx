import Link from 'next/link'
import { findDuplicateLeads } from '../../../server/crm/duplicate-leads'

/** Warns when another lead shares this lead's email or phone, so the team merges work instead of repeating it. */
export async function LeadDuplicateNotice({
  leadId,
  email,
  phone,
}: Readonly<{ leadId: string; email: string | null; phone: string | null }>) {
  const found = await findDuplicateLeads({ leadId, email, phone })
  const matches = found.leads
  if (matches.length === 0) return null
  return (
    <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <span className="font-medium">Possible duplicate.</span> Another lead has the same email or phone:{' '}
      {matches.slice(0, 3).map((match, index) => (
        <span key={match.id}>
          {index > 0 ? ', ' : null}
          <Link href={`/leads/${match.id}`} className="underline underline-offset-2">
            {match.title}
          </Link>
        </span>
      ))}
      {found.total > 3 ? ` and ${String(found.total - 3)} more` : null}
    </div>
  )
}
