import { fileURLToPath } from 'node:url'

/** Repository root. */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** Directory holding the planted check fixtures. */
export const FIXTURES = fileURLToPath(new URL('../../fixtures/checks/', import.meta.url))
