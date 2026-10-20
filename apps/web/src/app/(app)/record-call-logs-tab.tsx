import { loadCallLogs } from '../../server/queries/crm/call-logs'
import { RecordCallLogs } from './record-call-logs'

export async function RecordCallLogsTab({
  recordType,
  recordId,
}: Readonly<{ recordType: 'lead' | 'contact'; recordId: string }>) {
  const calls = await loadCallLogs(recordType, recordId)
  return <RecordCallLogs recordType={recordType} recordId={recordId} initialCalls={calls} />
}
