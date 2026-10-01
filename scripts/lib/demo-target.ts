import { assertLocalOnly } from '../seed/local-env'

/** Where a demo script works: the local database, or a named tenant's live workspace. */
export interface DemoTarget {
  readonly workspace: boolean
  readonly label: string
}

/**
 * Reads `--remote <slug>` from the arguments. Local runs refuse to start when the environment points at Cloudflare;
 * a remote run needs OPS_ALLOW_LIVE=1 and then points the app's bindings at that tenant.
 */
export function demoTarget(argv: readonly string[], env: NodeJS.ProcessEnv): DemoTarget {
  const at = argv.indexOf('--remote')
  if (at < 0) {
    if (argv.includes('--workspace')) {
      // A local database that already holds a real-looking workspace (for rehearsing a live run).
      assertLocalOnly(env)
      return { workspace: true, label: 'the local workspace' }
    }
    assertLocalOnly(env)
    return { workspace: false, label: 'the local database' }
  }
  const slug = argv[at + 1]
  if (slug === undefined || slug.startsWith('--')) throw new Error('usage: --remote <tenant slug>')
  if (env['OPS_ALLOW_LIVE'] !== '1') throw new Error('a live run needs OPS_ALLOW_LIVE=1 in the operator environment')
  env['PAYLOAD_REMOTE_BINDINGS'] = '1'
  env['CLOUDFLARE_ENV'] = slug
  return { workspace: true, label: `the live ${slug} workspace` }
}
