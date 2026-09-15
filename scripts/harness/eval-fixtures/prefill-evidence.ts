import { readFileSync } from 'node:fs'

const evidence = JSON.parse(readFileSync('evidence.json', 'utf8')) as Record<string, unknown>
const required = {
  displayName: 'Mirch Media',
  host: 'crm.mirchmedia.com',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  ownerEmail: 'mirchads@gmail.com',
  ownerName: 'Vivek Thapar',
}
for (const [key, value] of Object.entries(required)) {
  if (evidence[key] !== value) throw new Error(`prefill evidence missing ${key}`)
}
console.log('prefill evidence covers confirmed Mirch tenant')
