import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { r2Storage } from '@payloadcms/storage-r2'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { CloudflareContext } from '@opennextjs/cloudflare'
import { CloudflareMailSender, ConsoleMailSender, payloadEmailAdapter } from '@ops/adapter-cloudflare'
import { COLLECTIONS, settingsGlobal, spikeCollections } from '@ops/adapter-payload'
import { buildConfig } from 'payload'
import type { Config } from 'payload'
import type { GetPlatformProxyOptions } from 'wrangler'
import type * as Wrangler from 'wrangler'

type WranglerModule = typeof Wrangler
type LogFn = (objOrMsg: object | string, msg?: string) => void

const dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
// Remote Cloudflare bindings are opt-in (lead-only remote migrations); builds and local runs never contact Cloudflare.
const useRemoteBindings = process.env.PAYLOAD_REMOTE_BINDINGS === '1'
// Built at runtime so the bundler never tries to include wrangler in the Worker.
const WRANGLER_MODULE = '__wrangler'.replaceAll('_', '')

const realpath = (value: string): string | undefined => {
  try {
    return fs.existsSync(value) ? fs.realpathSync(value) : undefined
  } catch {
    return undefined
  }
}

const isCLI = process.argv.some((value) => {
  const resolved = realpath(value)
  if (!resolved) return false
  return (
    resolved.endsWith(path.join('payload', 'bin.js')) || resolved.endsWith(path.join('next', 'dist', 'bin', 'next'))
  )
})

const createLog =
  (level: string, write: (line: string) => void): LogFn =>
  (objOrMsg, msg) => {
    const entry = typeof objOrMsg === 'string' ? { msg: objOrMsg } : { ...objOrMsg, msg }
    write(JSON.stringify({ level, ...entry }))
  }

const noop: LogFn = () => undefined

// Workers cannot run pino-pretty; production logs are JSON lines through console.
const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL ?? 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: noop,
} as unknown as NonNullable<Config['logger']>

async function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  const { getPlatformProxy } = (await import(/* webpackIgnore: true */ WRANGLER_MODULE)) as WranglerModule
  const options: GetPlatformProxyOptions = { remoteBindings: useRemoteBindings }
  if (process.env.CLOUDFLARE_ENV) options.environment = process.env.CLOUDFLARE_ENV
  return (await getPlatformProxy(options)) as unknown as CloudflareContext
}

const cloudflare =
  isCLI || !isProduction ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true })

const { env } = cloudflare
const mailSender = env.MAIL_TRANSPORT === 'cloudflare' ? new CloudflareMailSender(env.EMAIL) : new ConsoleMailSender()

export default buildConfig({
  admin: {
    user: COLLECTIONS.users,
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      graphics: { Logo: './components/payload/BlankLogo#BlankLogo' },
    },
  },
  // Payload appends its own collections to this array, so it gets a copy.
  collections: [...spikeCollections],
  globals: [settingsGlobal],
  secret: process.env.PAYLOAD_SECRET,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  graphQL: { disable: true },
  defaultDepth: 0,
  maxDepth: 2,
  // Committed migrations are the only schema source (spec §11), so development schema push is off.
  db: sqliteD1Adapter({ binding: env.D1, idType: 'uuid', push: false }),
  email: payloadEmailAdapter({ sender: mailSender, fromAddress: env.MAIL_FROM_ADDRESS, fromName: env.MAIL_FROM_NAME }),
  ...(isProduction ? { logger: cloudflareLogger } : {}),
  plugins: [r2Storage({ bucket: env.R2, collections: { [COLLECTIONS.attachments]: true } })],
})
