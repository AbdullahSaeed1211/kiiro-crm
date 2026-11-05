import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

interface WebpackConfig {
  resolve: { extensionAlias?: Record<string, string[]> }
}

const nextConfig: NextConfig = {
  // Permit isolated validation builds without replacing the active local dev server output.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // `next dev` would otherwise write AGENTS.md and CLAUDE.md into the app directory.
  agentRules: false,
  // Workspace packages ship TypeScript source.
  transpilePackages: [
    '@ops/ui',
    '@ops/adapter-cloudflare',
    '@ops/adapter-payload',
    '@ops/kernel',
    '@ops/module-identity',
    '@ops/module-work',
    '@ops/platform',
  ],
  // Packages with Cloudflare Workers (workerd) specific code: https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],
  // One page-data worker: each worker would start its own local Wrangler proxy on the same local D1 file (SQLITE_BUSY).
  // A visited route keeps its payload for 30s, so going back to a list is immediate; every server action calls
  // revalidatePath, which clears the cache for the person who saved. Another person's change can take up to 30s
  // to appear on a page that is already open.
  experimental: { cpus: 1, staleTimes: { dynamic: 30, static: 30 } },
  webpack: (webpackConfig: WebpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
