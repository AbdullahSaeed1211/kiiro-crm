import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

interface WebpackConfig {
  resolve: { extensionAlias?: Record<string, string[]> }
}

const nextConfig: NextConfig = {
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
  },
  // Packages with Cloudflare Workers (workerd) specific code: https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],
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
