import { readFileSync } from 'node:fs'

interface RecordEntry {
  id: string
  ownerId: string
  assigneeIds: string[]
}

interface Fixture {
  actor: string
  records: RecordEntry[]
}
const { actor, records } = JSON.parse(readFileSync('records.json', 'utf8')) as Fixture
const visible =
  process.argv[2] === 'bad'
    ? records
    : records.filter((record) => record.ownerId === actor || record.assigneeIds.includes(actor))
const expected = records
  .filter((record) => record.ownerId === actor || record.assigneeIds.includes(actor))
  .map((record) => record.id)
if (visible.map((record) => record.id).join(',') !== expected.join(',')) {
  console.error(`staff scope leaked: ${visible.map((record) => record.id).join(',')}`)
  process.exitCode = 1
} else console.log('staff scope returns only owned or assigned records')
