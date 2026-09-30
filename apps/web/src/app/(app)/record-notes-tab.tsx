import { loadRecordNotes } from '../../server/queries/crm/record-notes'
import { RecordNotes } from './record-notes'

/** Server component: loads a record's notes and renders the client notes panel, so client pages receive it as a node. */
export async function RecordNotesTab({ recordType, recordId }: Readonly<{ recordType: string; recordId: string }>) {
  const notes = await loadRecordNotes(recordType, recordId)
  return <RecordNotes recordType={recordType} recordId={recordId} notes={notes} />
}
