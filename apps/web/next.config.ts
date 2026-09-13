import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

interface WebpackConfig {
  resolve: { extensionAlias?: Record<string, string[]> }
}

const nextConfig: NextConfig = {
  // `next dev` would otherwise write AGENTS.md and CLAUDE.md into the app directory.
  agentRules: false,
  // Workspace packages ship TypeScript source.
  transpilePackages: [
    '@ops/ui',
    '@ops/adapter-cloudflare',
    '@ops/adapter-payload',
    '@ops/kernel',
    '@ops/module-work',
    '@ops/platform',
  ],
  // Packages with Cloudflare Workers (workerd) specific code: https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],
  // One page-data worker: each worker would start its own local Wrangler proxy on the same local D1 file (SQLITE_BUSY).
  experimental: { cpus: 1 },
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
