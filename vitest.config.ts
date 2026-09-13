import { configDefaults, defineConfig } from 'vitest/config'

const SPIKE_TESTS = 'packages/**/test/spike/**'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['packages/**/test/**/*.test.ts', 'apps/web/test/**/*.test.ts', 'scripts/test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, SPIKE_TESTS],
        },
      },
      {
        // Starts Payload on a local D1 copy through Wrangler (no network), so it runs alone and with long hooks.
        test: {
          name: 'integration',
          environment: 'node',
          include: [`${SPIKE_TESTS}/*.test.ts`],
          hookTimeout: 180_000,
          testTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'packages/modules/*/src/**', 'packages/adapters/*/src/**', 'scripts/**/*.ts'],
      exclude: ['packages/ui/src/components/ui/**', 'scripts/test/**', 'scripts/fixtures/**'],
    },
  },
})
