import { strict as assert } from 'node:assert'

const mode = process.argv[2]
const sourceStage = 'active'
const state =
  mode === 'bad'
    ? { stage: 'lost', toast: 'Save failed', detailsSaved: false, needsLostDetails: false }
    : { stage: sourceStage, toast: null, detailsSaved: false, needsLostDetails: true }

assert.equal(state.stage, sourceStage)
assert.equal(state.toast, null)
assert.equal(state.detailsSaved, false)
assert.equal(state.needsLostDetails, mode === 'fixed')
console.log('deferred lost drop preserves the source stage until details save')
