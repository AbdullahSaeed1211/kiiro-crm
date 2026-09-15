import { readFileSync } from 'node:fs'

interface TransitionFixture {
  readonly transition: {
    readonly recordType?: string
    readonly recordId?: string
    readonly workflow?: string
    readonly record?: unknown
    readonly workflowId?: unknown
  }
}

const mode = process.argv[2]
if (mode !== 'repro' && mode !== 'fixed') throw new Error('expected repro or fixed')
const fixture = JSON.parse(readFileSync('surface.json', 'utf8')) as TransitionFixture
const transition = fixture.transition
const valid =
  typeof transition.recordType === 'string' &&
  typeof transition.recordId === 'string' &&
  typeof transition.workflow === 'string' &&
  transition.record === undefined &&
  transition.workflowId === undefined
if (!valid) {
  console.error('stage transition payload is not persistable in the Payload collection shape')
  process.exit(1)
}
console.log('stage transition payload is persistable in the Payload collection shape')
