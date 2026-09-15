import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const LOCAL_URL = 'http://localhost:3000'

// `next dev` does not read .dev.vars, so the local secret comes from the committed example.
function devSecret(): string {
  const line = readFileSync('apps/web/.dev.vars.example', 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith('PAYLOAD_SECRET='))
  return line?.slice('PAYLOAD_SECRET='.length) ?? ''
}

// Without E2E_BASE_URL the suite resets, seeds and starts the local app itself.
const localServer = {
  webServer: {
    command: 'node_modules/.bin/tsx scripts/e2e-server.ts',
    url: `${LOCAL_URL}/api/v1/health`,
    reuseExistingServer: !process.env['CI'],
    timeout: 300_000,
    env: { PAYLOAD_SECRET: process.env['PAYLOAD_SECRET'] ?? devSecret() },
  },
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? LOCAL_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Needs `pnpm exec playwright install webkit`.
    { name: 'mobile', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
  ],
  ...(process.env['E2E_BASE_URL'] === undefined ? localServer : {}),
})
